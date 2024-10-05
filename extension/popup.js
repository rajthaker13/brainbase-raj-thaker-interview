document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('isRecording', (data) => {
        const isRecording = data.isRecording || false;
        updateButtonState(isRecording);
    });
});

document.getElementById('toggleRecording').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'toggleRecording' })
        .then(response => {
            updateButtonState(response.isRecording);
            if (!response.isRecording) {
                promptEndpointAndSave();
            }
        })
        .catch(error => console.error('Error toggling recording:', error));
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
        chrome.runtime.sendMessage({ type: 'getRecordedActions' })
            .then(response => {
                const workflow = response.actions;
                if (workflow && workflow.length > 0) {
                    saveWorkflow(endpoint, workflow);
                } else {
                    alert('No actions were recorded.');
                }
            })
            .catch(error => console.error('Error getting recorded actions:', error));
    }
}

function saveWorkflow(endpoint, workflow) {
    // Ensure the initial_href action includes cookies
    if (workflow.length > 0 && workflow[0].type === 'initial_href') {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.cookies.getAll({ url: tabs[0].url }, function (cookies) {
                workflow[0].cookies = cookies;
                sendWorkflowToServer(endpoint, workflow);
            });
        });
    } else {
        sendWorkflowToServer(endpoint, workflow);
    }
}

function sendWorkflowToServer(endpoint, workflow) {
    console.log('Saving workflow:', { endpoint, workflow });
    fetch('http://localhost:8000/uipi/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint, workflow })
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`Network response was not ok: ${response.status} ${response.statusText}\n${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Workflow saved successfully:', data);
            alert('Workflow saved successfully');
            return chrome.runtime.sendMessage({ type: 'clearRecordedActions' });
        })
        .then(() => console.log('Recorded actions cleared'))
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save workflow: ' + error.message);
        });
}