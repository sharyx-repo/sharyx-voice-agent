let ws;
let mediaRecorder;
let audioContext;
let processor;
let isCalling = false;

const callBtn = document.getElementById('callBtn');
const status = document.getElementById('status');
const bars = document.querySelectorAll('.bar');

callBtn.onclick = async () => {
    if (isCalling) {
        stopCall();
        return;
    }
    startCall();
};

async function startCall() {
    isCalling = true;
    callBtn.innerText = '🛑 Stop Call';
    callBtn.classList.add('active');
    status.innerText = 'Connecting...';

    // 1. Setup WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => {
        status.innerText = '💻 Connected. Speak now!';
        setupMicrophone();
    };

    ws.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        if (data.event === 'audio') {
            playAudio(data.payload);
        }
    };
}

async function setupMicrophone() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    
    // Low-pass audio processing to 16kHz
    processor = audioContext.createScriptProcessor(4096, 1, 1);
    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Simple visualization
        const volume = Math.max(...inputData);
        bars.forEach(bar => bar.style.height = `${Math.random() * volume * 200 + 5}px`);

        // Convert to PCM 16bit (Simplified)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) { pcmData[i] = inputData[i] * 0x7FFF; }
        
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'audio', payload: base64 }));
        }
    };
}

function playAudio(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binary.charCodeAt(i); }
    
    const audioBlob = new Blob([bytes.buffer], { type: 'audio/wav' });
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.play();
}

function stopCall() {
    isCalling = false;
    callBtn.innerText = '📞 Click to Call';
    callBtn.classList.remove('active');
    status.innerText = 'Call ended.';
    if (ws) ws.close();
    if (audioContext) audioContext.close();
}
