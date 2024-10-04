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
                await sendMessageToTab(tab.id, { type: 'recordingStateChanged', isRecording });
            }
        });

        if (isRecording) {
            recordedActions = []; // Clear previous actions when starting a new recording
        } else {
            // Save recorded actions when recording stops
            try {
                chrome.storage.local.set({ recordedActions: recordedActions });
            } catch (error) {
                console.error('Error stringifying recordedActions:', error);
                chrome.storage.local.set({ recordedActions: '[]' });
            }
        }

        sendResponse({ isRecording });
    } else if (message.type === 'recordAction' && isRecording) {
        recordedActions.push(message.action);
        console.log('Recorded action:', message.action);
        sendResponse({ success: true });
    } else if (message.type === 'getRecordedActions') {
        sendResponse({ actions: recordedActions });
    } else if (message.type === 'clearRecordedActions') {
        recordedActions = [];
        chrome.storage.local.remove('recordedActions');
    }
    return true; // Indicates that the response is sent asynchronously
});

// Initialize recording state and actions
chrome.storage.local.get(['isRecording', 'recordedActions'], (data) => {
    isRecording = data.isRecording || false;
    try {
        if (typeof data.recordedActions === 'string') {
            recordedActions = JSON.parse(data.recordedActions);
        } else if (Array.isArray(data.recordedActions)) {
            recordedActions = data.recordedActions;
        } else {
            recordedActions = [];
        }
    } catch (error) {
        console.error('Error parsing recordedActions:', error);
        recordedActions = [];
    }

    // Ensure recordedActions is always an array
    if (!Array.isArray(recordedActions)) {
        recordedActions = [];
    }

    console.log('Initialized recordedActions:', recordedActions);

    // Notify all tabs about the initial recording state
    chrome.tabs.query({}, async function (tabs) {
        for (const tab of tabs) {
            await sendMessageToTab(tab.id, { type: 'recordingStateChanged', isRecording });
        }
    });
});

// Listen for tab updates and inject content script if necessary
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }).then(() => {
            console.log('Content script injected into tab', tabId);
            sendMessageToTab(tabId, { type: 'recordingStateChanged', isRecording });
        }).catch((error) => {
            console.log('Failed to inject content script into tab', tabId, error);
        });
    }
});