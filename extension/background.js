let isRecording = false;
let recordedActions = [];

function sendMessageToTab(tabId, message) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                console.log(`Failed to send message to tab ${tabId}:`, chrome.runtime.lastError);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'toggleRecording') {
        isRecording = !isRecording;
        chrome.storage.local.set({ isRecording });

        // Notify all tabs about the recording state change
        chrome.tabs.query({}, async function (tabs) {
            for (let tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { type: 'recordingStateChanged', isRecording });
                } catch (error) {
                    console.log(`Failed to send message to tab ${tab.id}:`, error);
                }
            }
        });

        if (isRecording) {
            recordedActions = []; // Clear previous actions when starting a new recording
        } else {
            // Save recorded actions when recording stops
            chrome.storage.local.set({ recordedActions: JSON.stringify(recordedActions) });
        }

        sendResponse({ isRecording });
        return false; // Synchronous response
    } else if (message.type === 'recordAction' && isRecording) {
        const action = {
            ...message.action,
            tabId: sender.tab.id, // Add the tab ID to each recorded action
            tabUrl: sender.tab.url // Add the tab URL to each recorded action
        };
        recordedActions.push(action);
        console.log('Recorded action:', action);
        sendResponse({ success: true });
        return false; // Synchronous response
    } else if (message.type === 'getRecordedActions') {
        sendResponse({ actions: recordedActions });
        return false; // Synchronous response
    } else if (message.type === 'clearRecordedActions') {
        recordedActions = [];
        chrome.storage.local.remove('recordedActions');
        sendResponse({ success: true });
        return false; // Synchronous response
    } else if (message.type === 'getCookies') {
        if (chrome.cookies && chrome.cookies.getAll) {
            chrome.cookies.getAll({ url: sender.tab.url }, (cookies) => {
                sendResponse(cookies);
            });
        } else {
            console.warn('chrome.cookies API is not available');
            sendResponse([]);
        }
        return true; // Indicates an asynchronous response
    }
});

// Initialize recording state and actions
chrome.storage.local.get(['isRecording', 'recordedActions'], (data) => {
    isRecording = data.isRecording || false;
    try {
        recordedActions = JSON.parse(data.recordedActions || '[]');
    } catch (error) {
        console.error('Error parsing recordedActions:', error);
        recordedActions = [];
    }

    console.log('Initialized recordedActions:', recordedActions);

    // Notify all tabs about the initial recording state
    chrome.tabs.query({}, async function (tabs) {
        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, { type: 'recordingStateChanged', isRecording });
            } catch (error) {
                console.log(`Failed to send initial state to tab ${tab.id}:`, error);
            }
        }
    });
});

// Listen for tab updates and inject content script if necessary
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        if (chrome.scripting && chrome.scripting.executeScript) {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }).then(() => {
                console.log('Content script injected into tab', tabId);
                chrome.tabs.sendMessage(tabId, { type: 'recordingStateChanged', isRecording });
            }).catch((error) => {
                console.log('Failed to inject content script into tab', tabId, error);
            });
        } else {
            console.warn('chrome.scripting API is not available');
            // Fallback method to inject content script
            chrome.tabs.executeScript(tabId, { file: 'content.js' }, () => {
                if (chrome.runtime.lastError) {
                    console.log('Failed to inject content script into tab', tabId, chrome.runtime.lastError);
                } else {
                    console.log('Content script injected into tab', tabId);
                    chrome.tabs.sendMessage(tabId, { type: 'recordingStateChanged', isRecording });
                }
            });
        }
    }
});
