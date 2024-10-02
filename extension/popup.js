document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('isRecording', (data) => {
        const isRecording = data.isRecording || false;
        document.getElementById('status').textContent = isRecording ? 'Recording' : 'Not Recording';
        document.getElementById('toggleRecording').textContent = isRecording ? 'Stop Recording' : 'Start Recording';
    });
});

document.getElementById('toggleRecording').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'toggleRecording' }, (response) => {
        document.getElementById('status').textContent = response.isRecording ? 'Recording' : 'Not Recording';
        document.getElementById('toggleRecording').textContent = response.isRecording ? 'Stop Recording' : 'Start Recording';
    });
});

document.getElementById('saveRecording').addEventListener('click', () => {
    const endpoint = document.getElementById('endpoint').value;
    if (!endpoint) {
        alert('Please enter an endpoint');
        return;
    }

    chrome.storage.local.get('recordedActions', (data) => {
        const recordedActions = data.recordedActions || [];
        fetch('http://localhost:8000/uipi/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ endpoint, workflow: recordedActions })
        })
            .then(response => response.json())
            .then(data => {
                alert('Recording saved successfully');
                chrome.storage.local.remove('recordedActions');
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to save recording');
            });
    });
});