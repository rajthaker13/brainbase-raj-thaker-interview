let isRecording = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'recordingStateChanged') {
        isRecording = message.isRecording;
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
    if (isRecording) {
        startRecording();
    }
});

function startRecording() {
    document.addEventListener('mousemove', recordMouseMove);
    document.addEventListener('click', recordClick);
    document.addEventListener('scroll', recordScroll);
    document.addEventListener('input', recordInput);
    window.addEventListener('beforeunload', recordHref);
}

function stopRecording() {
    document.removeEventListener('mousemove', recordMouseMove);
    document.removeEventListener('click', recordClick);
    document.removeEventListener('scroll', recordScroll);
    document.removeEventListener('input', recordInput);
    window.removeEventListener('beforeunload', recordHref);
}

function recordMouseMove(event) {
    const action = {
        type: 'mousemove',
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now()
    };
    console.log(action);
    chrome.runtime.sendMessage({ type: 'recordAction', action });
}

function recordClick(event) {
    const action = {
        type: 'click',
        x: event.clientX,
        y: event.clientY,
        element: event.target.tagName,
        elementId: event.target.id,
        elementClasses: event.target.className,
        timestamp: Date.now()
    };
    console.log(action);
    chrome.runtime.sendMessage({ type: 'recordAction', action });
}

function recordScroll(event) {
    const action = {
        type: 'scroll',
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        timestamp: Date.now()
    };
    console.log(action);
    chrome.runtime.sendMessage({ type: 'recordAction', action });
}

function recordInput(event) {
    const action = {
        type: 'input',
        element: event.target.tagName,
        elementId: event.target.id,
        elementClasses: event.target.className,
        value: event.target.value,
        timestamp: Date.now()
    };
    console.log(action);
    chrome.runtime.sendMessage({ type: 'recordAction', action });
}

function recordHref(event) {
    const action = {
        type: 'href',
        href: window.location.href,
        timestamp: Date.now()
    };
    console.log(action);
    chrome.runtime.sendMessage({ type: 'recordAction', action });
}