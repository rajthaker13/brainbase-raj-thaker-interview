// Use IIFE to avoid polluting global scope and prevent redeclaration issues
(function () {
    // Check if the script has already been injected
    if (window.brainbaseUiPIInjected) return;
    window.brainbaseUiPIInjected = true;

    let isRecording = false;
    let lastRecordedHref = '';
    let lastRecordedMouseMove = 0;
    const MOUSE_MOVE_THROTTLE = 100; // Minimum ms between mouse move recordings

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
        recordInitialHref();
        document.addEventListener('mousemove', throttledRecordMouseMove);
        document.addEventListener('click', recordClick);
        document.addEventListener('scroll', throttledRecordScroll);
        document.addEventListener('input', recordInput);
        document.addEventListener('keydown', recordKeydown);
        window.addEventListener('popstate', recordHref);
    }

    function stopRecording() {
        console.log('Stopping recording');
        document.removeEventListener('mousemove', throttledRecordMouseMove);
        document.removeEventListener('click', recordClick);
        document.removeEventListener('scroll', throttledRecordScroll);
        document.removeEventListener('input', recordInput);
        document.removeEventListener('keydown', recordKeydown);
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

    function recordCookies() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'getCookies' }, (cookies) => {
                if (chrome.runtime.lastError) {
                    console.warn('Error getting cookies:', chrome.runtime.lastError);
                    resolve([]);
                } else {
                    resolve(cookies || []);
                }
            });
        });
    }

    async function recordInitialHref() {
        const cookies = await recordCookies();
        const action = {
            type: 'initial_href',
            href: window.location.href,
            timestamp: Date.now(),
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            cookies: cookies
        };
        console.log('Recorded initial href:', action);
        sendMessageSafely({ type: 'recordAction', action }).catch(error => {
            console.log('Error sending initial href action:', error);
        });
    }

    function throttledRecordMouseMove(event) {
        if (!isRecording) return;
        const now = Date.now();
        if (now - lastRecordedMouseMove < MOUSE_MOVE_THROTTLE) return;

        const target = event.target;
        if (isInteractiveElement(target)) {
            lastRecordedMouseMove = now;
            const action = {
                type: 'mousemove',
                x: event.clientX,
                y: event.clientY,
                timestamp: now,
                targetElement: getElementInfo(target)
            };
            console.log('Recorded mouse move:', action);
            sendMessageSafely({ type: 'recordAction', action }).catch(error => {
                console.log('Error sending mousemove action:', error);
            });
        }
    }

    function isInteractiveElement(element) {
        const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
        return interactiveTags.includes(element.tagName) ||
            element.onclick ||
            element.role === 'button' ||
            element.tabIndex >= 0;
    }

    function recordClick(event) {
        if (!isRecording) return;
        const target = event.target;
        const action = {
            type: 'click',
            x: event.clientX,
            y: event.clientY,
            timestamp: Date.now(),
            targetElement: getElementInfo(target)
        };
        console.log('Recorded click:', action);
        sendMessageSafely({ type: 'recordAction', action }).catch(error => {
            console.log('Error sending click action:', error);
        });
    }

    function getElementInfo(element) {
        return {
            tagName: element.tagName,
            id: element.id,
            classes: Array.from(element.classList),
            textContent: element.textContent.trim().substring(0, 50), // Limit text content
            href: element.href || '',
            path: getElementPath(element)
        };
    }

    function getElementPath(element) {
        const path = [];
        while (element && element !== document.body) {
            let selector = element.tagName.toLowerCase();
            if (element.id) {
                selector += `#${element.id}`;
            } else if (element.className && typeof element.className === 'string') {
                selector += `.${element.className.split(' ').join('.')}`;
            } else if (element.classList && element.classList.length) {
                selector += `.${Array.from(element.classList).join('.')}`;
            }
            path.unshift(selector);
            element = element.parentElement;
        }
        return path.join(' > ');
    }

    let lastScrollTime = 0;
    const SCROLL_THROTTLE = 200; // Minimum ms between scroll recordings

    function throttledRecordScroll() {
        if (!isRecording) return;
        const now = Date.now();
        if (now - lastScrollTime < SCROLL_THROTTLE) return;

        lastScrollTime = now;
        const action = {
            type: 'scroll',
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            timestamp: now
        };
        console.log('Recorded scroll:', action);
        sendMessageSafely({ type: 'recordAction', action }).catch(error => {
            console.log('Error sending scroll action:', error);
        });
    }

    function recordInput(event) {
        if (!isRecording) return;
        const target = event.target;
        const action = {
            type: 'input',
            timestamp: Date.now(),
            targetElement: getElementInfo(target),
            value: target.value,
            inputType: event.inputType
        };
        console.log('Recorded input:', action);
        sendMessageSafely({ type: 'recordAction', action }).catch(error => {
            console.log('Error sending input action:', error);
        });
    }

    function recordKeydown(event) {
        if (!isRecording) return;
        const target = event.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            const action = {
                type: 'keydown',
                timestamp: Date.now(),
                targetElement: getElementInfo(target),
                key: event.key,
                keyCode: event.keyCode
            };
            console.log('Recorded keydown:', action);
            sendMessageSafely({ type: 'recordAction', action }).catch(error => {
                console.log('Error sending keydown action:', error);
            });
        }
    }

    function recordHref() {
        if (!isRecording) return;
        const currentHref = window.location.href;
        if (currentHref !== lastRecordedHref) {
            recordCookies().then(cookies => {
                const action = {
                    type: 'href',
                    href: currentHref,
                    timestamp: Date.now(),
                    cookies: cookies
                };
                console.log('Recorded href change:', action);
                sendMessageSafely({ type: 'recordAction', action }).catch(error => {
                    console.log('Error sending href action:', error);
                });
                lastRecordedHref = currentHref;
            });
        }
    }
})();