document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('isRecording', (data) => {
        const isRecording = data.isRecording || false;
        updateButtonState(isRecording);
    });
});

document.getElementById('toggleRecording').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'toggleRecording' }, (response) => {
        updateButtonState(response.isRecording);
        if (!response.isRecording) {
            promptEndpointAndSave();
        }
    });
});

function updateButtonState(isRecording) {
    const button = document.getElementById('toggleRecording');
    const status = document.getElementById('status');
    button.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
    button.classList.toggle('recording', isRecording);
    status.textContent = isRecording ? 'Recording' : 'Not Recording';
}

function promptEndpointAndSave() {
    const endpoint = prompt('Enter an endpoint for this workflow:');
    if (endpoint) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentUrl = tabs[0].url;
            chrome.storage.local.get('recordedActions', (data) => {
                const recordedActions = data.recordedActions || [];
                const workflow = {
                    startUrl: currentUrl,
                    actions: recordedActions
                };
                saveWorkflow(endpoint, workflow);
            });
        });
    }
}

function saveWorkflow(endpoint, workflow) {
    fetch('http://localhost:8000/uipi/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint, workflow })
    })
        .then(response => response.json())
        .then(data => {
            alert('Workflow saved successfully');
            chrome.storage.local.remove('recordedActions');
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save workflow');
        });
}