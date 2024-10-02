let isRecording = false;
let recordedActions = [];

function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, response => {
            if (chrome.runtime.lastError) {
                // Ignore the error, tab might not be ready or might have been closed
                resolve();
            } else {
                resolve(response);
            }
        });
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'toggleRecording') {
        isRecording = !isRecording;
        chrome.storage.local.set({ isRecording });
        if (!isRecording) {
            // Save the recorded actions to storage
            chrome.storage.local.set({ recordedActions });
        }
        // Notify all tabs about the recording state change
        chrome.tabs.query({}, async function (tabs) {
            for (const tab of tabs) {
                await sendMessageToTab(tab.id, { type: 'recordingStateChanged', isRecording });
            }
        });
        sendResponse({ isRecording });
    } else if (message.type === 'recordAction' && isRecording) {
        recordedActions.push(message.action);
        console.log('Recorded action:', message.action);
    }
});

chrome.storage.local.get('isRecording', (data) => {
    isRecording = data.isRecording || false;
    // Notify all tabs about the initial recording state
    chrome.tabs.query({}, async function (tabs) {
        for (const tab of tabs) {
            await sendMessageToTab(tab.id, { type: 'recordingStateChanged', isRecording });
        }
    });
});