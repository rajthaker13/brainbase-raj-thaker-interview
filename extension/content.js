// Use IIFE to avoid polluting global scope and prevent redeclaration issues
(function () {
    // Check if the script has already been injected
    if (window.brainbaseUiPIInjected) return;
    window.brainbaseUiPIInjected = true;

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
        recordInitialHref(); // Record initial URL as the first action
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

    function recordInitialHref() {
        const action = {
            type: 'initial_href',
            href: window.location.href,
            timestamp: Date.now(),
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        };
        console.log('Recorded initial href:', action);
        sendMessageSafely({ type: 'recordAction', action }).catch(error => {
            console.log('Error sending initial href action:', error);
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
        let target = event.target;

        // Traverse up the DOM tree to find the most relevant clickable parent
        while (target && target !== document.body) {
            if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.onclick || target.role === 'button') {
                break;
            }
            target = target.parentElement;
        }

        const rect = target.getBoundingClientRect();
        const action = {
            type: 'click',
            element: target.tagName,
            elementId: target.id,
            elementClasses: Array.from(target.classList),  // Change to list
            value: target.textContent.trim(),
            href: target.href || '',
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2),
            timestamp: Date.now(),
            path: getElementPath(target)
        };
        console.log('Recorded action:', action);
        sendMessageSafely({ type: 'recordAction', action }).catch(error => {
            console.log('Error sending click action:', error);
        });
    }

    function getElementPath(element) {
        const path = [];
        while (element && element !== document.body) {
            let selector = element.tagName.toLowerCase();
            if (element.id) {
                selector += `#${element.id}`;
            } else if (element.className) {
                selector += `.${element.className.split(' ').join('.')}`;
            }
            path.unshift(selector);
            element = element.parentElement;
        }
        return path.join(' > ');
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
})();