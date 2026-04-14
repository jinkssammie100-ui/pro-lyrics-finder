// ==========================================
// PRO LYRICS FINDER - MAIN APPLICATION LOGIC
// ==========================================

let currentTrackData = null; 

// --- Core Search Logic ---
async function searchLyrics() {
    const artistInput = document.getElementById('artist');
    const songInput = document.getElementById('song');
    const artist = artistInput.value.trim();
    const song = songInput.value.trim();
    const lyricsContainer = document.getElementById('lyrics-container');
    const floatingBtn = document.getElementById('floating-media-btn');
    
    if (!artist && !song) {
        alert("Please enter an artist or song to search.");
        return;
    }

    lyricsContainer.style.display = 'block';
    lyricsContainer.innerHTML = '<h3 style="color: var(--text-muted); padding: 20px;">Searching database...</h3>';
    if(floatingBtn) floatingBtn.style.display = 'none';

    try {
        const searchQuery = `${artist} ${song}`;
        const url = `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        if (data && data.length > 0) {
            const track = data[0]; 
            const lyricsText = track.plainLyrics || track.syncedLyrics || "No lyrics available for this song.";

            currentTrackData = { trackName: track.trackName, artistName: track.artistName };

            lyricsContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 30px;">
                    <div>
                        <h1 style="margin-bottom: 5px; font-size: 2.2rem; margin-top: 0; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${track.trackName}</h1>
                        <p style="color: #6c5ce7; font-weight: bold; margin-top: 0;">by ${track.artistName}</p>
                    </div>
                    <button onclick="saveCurrentShazam(event)" class="btn" style="background: var(--input-bg); color: var(--text-main); border: 2px solid var(--border-color); padding: 8px 15px; font-size: 14px; border-radius: 8px;">
                        ⭐ Save Shazam
                    </button>
                </div>
                <div>${lyricsText}</div>
            `;

            artistInput.value = ''; songInput.value = '';
            if(floatingBtn) floatingBtn.style.display = 'block';

            let coverArt = 'https://via.placeholder.com/400?text=No+Cover';
            let audioPlayer = '';
            
            try {
                const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(track.artistName + ' ' + track.trackName)}&entity=song&limit=1`;
                const itunesRes = await fetch(itunesUrl);
                const itunesData = await itunesRes.json();
                
                if (itunesData.results && itunesData.results.length > 0) {
                    coverArt = itunesData.results[0].artworkUrl100.replace('100x100bb', '400x400bb');
                    if (itunesData.results[0].previewUrl) {
                        audioPlayer = `<audio controls src="${itunesData.results[0].previewUrl}" style="width: 100%; height: 40px; margin-top: 15px; border-radius: 20px;"></audio>`;
                    }
                }
            } catch (e) { console.log("Could not fetch iTunes data."); }

            const ytLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(track.artistName + ' ' + track.trackName + ' music video')}`;
            const mediaTitle = document.getElementById('media-title');
            const mediaContent = document.getElementById('media-content');
            
            if (mediaTitle && mediaContent) {
                mediaTitle.innerText = track.trackName;
                mediaContent.innerHTML = `
                    <img src="${coverArt}" alt="Album Art" style="width: 200px; height: 200px; border-radius: 16px; box-shadow: 0 10px 20px rgba(0,0,0,0.2); object-fit: cover; margin-bottom: 15px;">
                    ${audioPlayer}
                    <a href="${ytLink}" target="_blank" class="btn btn-danger" style="display: block; margin-top: 20px; text-decoration: none;">▶️ Search on YouTube</a>
                `;
            }

        } else {
            lyricsContainer.innerHTML = `<p style="color: var(--danger); font-weight: bold; padding: 20px;">Sorry, we couldn't find any matches. Try checking your spelling!</p>`;
            if(floatingBtn) floatingBtn.style.display = 'none'; 
        }
    } catch (error) {
        lyricsContainer.innerHTML = `<p style="color: var(--danger); font-weight: bold; padding: 20px;">A network error occurred. Please try again later.</p>`;
    }
}

// ==========================================
// ADMOB BRIDGE & VOICE SEARCH LOGIC
// ==========================================
document.getElementById('mic-btn').addEventListener('click', () => {
    if (typeof AndroidBridge !== "undefined") {
        AndroidBridge.showRewardedAd(); 
    } else {
        alert("This premium feature is only available in the official Android app.");
    }
});

window.unlockMicFeature = function() {
    console.log("Ad finished! Unlocking Mic.");
    startVoiceSearch(); 
};

function startVoiceSearch() {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
        alert("Voice search is not supported on this device.");
        return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.start();

    // Change button text so user knows it is listening
    const micBtn = document.getElementById('mic-btn');
    const originalText = micBtn.innerHTML;
    micBtn.innerHTML = "🎙️ Listening...";

    recognition.onresult = function(event) {
        const spokenText = event.results[0][0].transcript;
        document.getElementById('song').value = spokenText;
        document.getElementById('artist').value = ''; 
        micBtn.innerHTML = originalText;
        searchLyrics(); 
    };

    recognition.onerror = function(event) {
        console.error("Microphone error: ", event.error);
        micBtn.innerHTML = originalText;
        alert("Microphone error. Please make sure the app has microphone permissions.");
    };
}

// --- Settings, Modals, Saved Shazams (Kept exactly as you wrote them) ---
const themeToggle = document.getElementById('theme-toggle');
if (localStorage.getItem('darkMode') === 'enabled') document.body.classList.add('dark-mode');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
    });
}

const fontSizeSelect = document.getElementById('font-size-select');
if (fontSizeSelect) {
    const savedFontSize = localStorage.getItem('lyricsFontSize') || '16px';
    document.getElementById('lyrics-container').style.fontSize = savedFontSize;
    fontSizeSelect.value = savedFontSize;
    fontSizeSelect.addEventListener('change', (e) => {
        document.getElementById('lyrics-container').style.fontSize = e.target.value; 
        localStorage.setItem('lyricsFontSize', e.target.value); 
    });
}

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
if (settingsBtn) settingsBtn.addEventListener('click', () => settingsModal.style.display = 'flex');
document.getElementById('close-settings').addEventListener('click', () => settingsModal.style.display = 'none');

window.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.style.display = 'none';
    if (document.getElementById('media-modal') && e.target === document.getElementById('media-modal')) document.getElementById('media-modal').style.display = 'none';
    if (document.getElementById('review-modal') && e.target === document.getElementById('review-modal')) document.getElementById('review-modal').style.display = 'none';
});

function saveCurrentShazam(event) {
    if (!currentTrackData) return;
    let saved = JSON.parse(localStorage.getItem('savedShazams')) || [];
    if (!saved.some(item => item.trackName === currentTrackData.trackName && item.artistName === currentTrackData.artistName)) {
        saved.unshift(currentTrackData); 
        localStorage.setItem('savedShazams', JSON.stringify(saved));
        renderSavedShazams(); 
        event.target.innerHTML = "✅ Saved!";
        event.target.style.borderColor = "#28a745";
        event.target.style.color = "#28a745";
    } else {
        alert("This song is already in your Saved Shazams!");
    }
}

function renderSavedShazams() {
    const list = document.getElementById('saved-shazams-list');
    if(!list) return;
    let saved = JSON.parse(localStorage.getItem('savedShazams')) || [];
    if(saved.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9em; margin: 0;">No saved Shazams yet.</p>';
        return;
    }
    list.innerHTML = saved.map(item => `
        <div style="background: var(--input-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;" onclick="loadSavedShazam('${item.artistName.replace(/'/g, "\\'")}', '${item.trackName.replace(/'/g, "\\'")}')">
            <strong style="display: block; font-size: 14px; color: var(--text-main);">${item.trackName}</strong>
            <span style="font-size: 12px; color: var(--text-muted);">${item.artistName}</span>
        </div>
    `).join('');
}

function loadSavedShazam(artist, song) {
    document.getElementById('artist').value = artist;
    document.getElementById('song').value = song;
    searchLyrics();
}

window.addEventListener('DOMContentLoaded', renderSavedShazams);

function generatePlaylistReview() {
    let saved = JSON.parse(localStorage.getItem('savedShazams')) || [];
    if (saved.length < 3) { alert("You need at least 3 Saved Shazams to generate a review!"); return; }
    const mix = saved.sort(() => 0.5 - Math.random()).slice(0, 3); 
    document.getElementById('review-title').innerText = "Review: The Vibe Check";
    document.getElementById('review-content').innerHTML = `<p>Curator Sammie is an absolute genius. A flawless 5/5 stars. 🌟🌟🌟🌟🌟</p><ol><li>${mix[0].trackName}</li><li>${mix[1].trackName}</li><li>${mix[2].trackName}</li></ol>`;
    document.getElementById('review-modal').style.display = 'flex';
}

// Make functions visible to HTML
window.searchLyrics = searchLyrics;
window.saveCurrentShazam = saveCurrentShazam;
window.loadSavedShazam = loadSavedShazam;
window.generatePlaylistReview = generatePlaylistReview;
