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
        chrome.runtime.sendMessage({ type: 'getRecordedActions' }, (response) => {
            const workflow = response.actions;
            if (workflow && workflow.length > 0) {
                saveWorkflow(endpoint, workflow);
            } else {
                alert('No actions were recorded.');
            }
        });
    }
}

function saveWorkflow(endpoint, workflow) {
    console.log('Saving workflow:', { endpoint, workflow });  // Log the data being sent
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
            chrome.runtime.sendMessage({ type: 'clearRecordedActions' });
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save workflow: ' + error.message);
        });
}