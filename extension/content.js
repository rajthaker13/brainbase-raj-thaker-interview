let isRecording = false;
let lastRecordedHref = '';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'recordingStateChanged') {
        isRecording = message.isRecording;
        console.log('Recording state changed:', isRecording);
        if (isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    }
});

// Check initial recording state
chrome.storage.local.get('isRecording', (data) => {
    isRecording = data.isRecording || false;
    console.log('Initial recording state:', isRecording);
    if (isRecording) {
        startRecording();
    }
});

function startRecording() {
    console.log('Starting recording');
    lastRecordedHref = window.location.href;
    recordHref(); // Record initial URL
    document.addEventListener('mousemove', recordMouseMove);
    document.addEventListener('click', recordClick);
    document.addEventListener('scroll', recordScroll);
    document.addEventListener('input', recordInput);
    window.addEventListener('popstate', recordHref);
}

function stopRecording() {
    console.log('Stopping recording');
    document.removeEventListener('mousemove', recordMouseMove);
    document.removeEventListener('click', recordClick);
    document.removeEventListener('scroll', recordScroll);
    document.removeEventListener('input', recordInput);
    window.removeEventListener('popstate', recordHref);
}

function sendMessageSafely(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, response => {
            if (chrome.runtime.lastError) {
                console.log("Failed to send message to background script:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}

function recordMouseMove(event) {
    if (!isRecording) return;
    const action = {
        type: 'mousemove',
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now()
    };
    console.log('Recorded action:', action);
    sendMessageSafely({ type: 'recordAction', action }).catch(error => {
        console.log('Error sending mousemove action:', error);
    });
}

function recordClick(event) {
    if (!isRecording) return;
    const action = {
        type: 'click',
        x: event.clientX,
        y: event.clientY,
        element: event.target.tagName,
        elementId: event.target.id,
        elementClasses: event.target.className,
        timestamp: Date.now()
    };
    console.log('Recorded action:', action);
    sendMessageSafely({ type: 'recordAction', action }).catch(error => {
        console.log('Error sending click action:', error);
    });

    // Check if href changed after click
    setTimeout(checkHrefChange, 100);
}

function recordScroll(event) {
    if (!isRecording) return;
    const action = {
        type: 'scroll',
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        timestamp: Date.now()
    };
    console.log('Recorded action:', action);
    sendMessageSafely({ type: 'recordAction', action }).catch(error => {
        console.log('Error sending scroll action:', error);
    });
}

function recordInput(event) {
    if (!isRecording) return;
    const action = {
        type: 'input',
        element: event.target.tagName,
        elementId: event.target.id,
        elementClasses: event.target.className,
        value: event.target.value,
        timestamp: Date.now()
    };
    console.log('Recorded action:', action);
    sendMessageSafely({ type: 'recordAction', action }).catch(error => {
        console.log('Error sending input action:', error);
    });
}

function recordHref() {
    if (!isRecording) return;
    const currentHref = window.location.href;
    if (currentHref !== lastRecordedHref) {
        const action = {
            type: 'href',
            href: currentHref,
            timestamp: Date.now()
        };
        console.log('Recorded action:', action);
        sendMessageSafely({ type: 'recordAction', action }).catch(error => {
            console.log('Error sending href action:', error);
        });
        lastRecordedHref = currentHref;
    }
}

function checkHrefChange() {
    if (window.location.href !== lastRecordedHref) {
        recordHref();
    }
}