// 1. IMPORT MUST BE AT THE VERY TOP
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

// ==========================================
// PRO LYRICS FINDER - MAIN APPLICATION LOGIC
// ==========================================

// --- Global Memory ---
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

            currentTrackData = {
                trackName: track.trackName,
                artistName: track.artistName
            };

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

            artistInput.value = '';
            songInput.value = '';

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
            } catch (e) {
                console.log("Could not fetch iTunes data.");
            }

            const ytLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(track.artistName + ' ' + track.trackName + ' music video')}`;

            const mediaTitle = document.getElementById('media-title');
            const mediaContent = document.getElementById('media-content');
            
            if (mediaTitle && mediaContent) {
                mediaTitle.innerText = track.trackName;
                mediaContent.innerHTML = `
                    <img src="${coverArt}" alt="Album Art" style="width: 200px; height: 200px; border-radius: 16px; box-shadow: 0 10px 20px rgba(0,0,0,0.2); object-fit: cover; margin-bottom: 15px;">
                    ${audioPlayer}
                    <a href="${ytLink}" target="_blank" class="btn btn-danger" style="display: block; margin-top: 20px; text-decoration: none;">
                        ▶️ Search on YouTube
                    </a>
                `;
            }

        } else {
            lyricsContainer.innerHTML = `<p style="color: var(--danger); font-weight: bold; padding: 20px;">Sorry, we couldn't find any matches. Try checking your spelling!</p>`;
            if(floatingBtn) floatingBtn.style.display = 'none'; 
        }

    } catch (error) {
        console.error("Error fetching lyrics:", error);
        lyricsContainer.innerHTML = `<p style="color: var(--danger); font-weight: bold; padding: 20px;">A network error occurred. Please try again later.</p>`;
    }
}

// ==========================================
// 1. THE BUTTON CLICK (Triggers the Ad)
// ==========================================
document.getElementById('mic-btn').addEventListener('click', () => {
    if (typeof AndroidBridge !== "undefined") {
        AndroidBridge.showRewardedAd(); 
    } else {
        alert("This premium feature is only available in the official Android app.");
    }
});

// ==========================================
// 2. THE UNLOCK FUNCTION (Android calls this after the ad)
// ==========================================
function unlockMicFeature() {
    console.log("Ad finished! Unlocking Mic.");
    // The ad is done, so NOW we trigger your voice search!
    startAndroidVoiceSearch(); 
}

// ==========================================
// 3. YOUR VOICE SEARCH LOGIC
// ==========================================
async function startAndroidVoiceSearch() {
    try {
        const permission = await SpeechRecognition.checkPermissions();
        
        if (permission.speechRecognition !== 'granted') {
            await SpeechRecognition.requestPermissions();
        }

        await SpeechRecognition.start({
            language: "en-US",
            maxResults: 1,
            prompt: "Say the song title...",
            partialResults: false,
            popup: true 
        });

        SpeechRecognition.addListener('partialResults', (data) => {
            if (data.matches && data.matches.length > 0) {
                const spokenText = data.matches[0];
                
                // Put what you said into the Song box
                document.getElementById('song').value = spokenText;
                
                // Clear the artist box so it searches broadly
                document.getElementById('artist').value = ''; 
                
                // Automatically search immediately!
                // (Assuming your search function is called searchLyrics)
                searchLyrics(); 
            }
        });

    } catch (error) {
        console.error("Microphone error: ", error);
        alert("Could not start the microphone. Check Android Settings.");
    }
}

// --- Settings, Dark Mode, & Modals Logic ---
const themeToggle = document.getElementById('theme-toggle');
if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
}
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
        } else {
            localStorage.setItem('darkMode', 'disabled');
        }
    });
}

const fontSizeSelect = document.getElementById('font-size-select');
const lyricsContainer = document.getElementById('lyrics-container');
if (fontSizeSelect && lyricsContainer) {
    const savedFontSize = localStorage.getItem('lyricsFontSize') || '16px';
    lyricsContainer.style.fontSize = savedFontSize;
    fontSizeSelect.value = savedFontSize;

    fontSizeSelect.addEventListener('change', (event) => {
        const newSize = event.target.value;
        lyricsContainer.style.fontSize = newSize; 
        localStorage.setItem('lyricsFontSize', newSize); 
    });
}

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');

if (settingsBtn) settingsBtn.addEventListener('click', () => settingsModal.style.display = 'flex');
if (closeSettings) closeSettings.addEventListener('click', () => settingsModal.style.display = 'none');

window.addEventListener('click', (event) => {
    if (event.target === settingsModal) settingsModal.style.display = 'none';
    const mediaModal = document.getElementById('media-modal');
    if (mediaModal && event.target === mediaModal) mediaModal.style.display = 'none';
    const reviewModal = document.getElementById('review-modal');
    if (reviewModal && event.target === reviewModal) reviewModal.style.display = 'none';
});


// --- Saved Shazams Logic ---
function saveCurrentShazam(event) {
    if (!currentTrackData) return;
    
    let saved = JSON.parse(localStorage.getItem('savedShazams')) || [];
    const isDuplicate = saved.some(item => item.trackName === currentTrackData.trackName && item.artistName === currentTrackData.artistName);
    
    if (!isDuplicate) {
        saved.unshift(currentTrackData); 
        localStorage.setItem('savedShazams', JSON.stringify(saved));
        
        renderSavedShazams(); 
        
        const btn = event.target;
        btn.innerHTML = "✅ Saved!";
        btn.style.borderColor = "#28a745";
        btn.style.color = "#28a745";
    } else {
        alert("This song is already in your Saved Shazams!");
    }
}

function renderSavedShazams() {
    const list = document.getElementById('saved-shazams-list');
    if(!list) return;
    
    let saved = JSON.parse(localStorage.getItem('savedShazams')) || [];
    
    if(saved.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9em; margin: 0;">No saved Shazams yet. Search for a song and hit Save!</p>';
        return;
    }

    list.innerHTML = saved.map(item => `
        <div style="background: var(--input-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s; text-align: left;" 
             onclick="loadSavedShazam('${item.artistName.replace(/'/g, "\\'")}', '${item.trackName.replace(/'/g, "\\'")}')"
             onmouseover="this.style.borderColor='#6c5ce7'; this.style.transform='translateX(5px)';" 
             onmouseout="this.style.borderColor='var(--border-color)'; this.style.transform='translateX(0)';">
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


// --- Playlist Review Generator ---
function generatePlaylistReview() {
    let saved = JSON.parse(localStorage.getItem('savedShazams')) || [];
    
    if (saved.length < 3) {
        alert("You need at least 3 Saved Shazams to generate a review! Go save some more tracks first.");
        return;
    }

    const shuffled = saved.sort(() => 0.5 - Math.random());
    const mix = shuffled.slice(0, 3); 

    const song1 = `<strong style="color: #6c5ce7;">${mix[0].trackName}</strong>`;
    const song2 = `<strong style="color: #6c5ce7;">${mix[1].trackName}</strong>`;
    const song3 = `<strong style="color: #6c5ce7;">${mix[2].trackName}</strong>`;

    const reviews = [
        `Curator Alex is an absolute genius. The playlist opens with the undeniable energy of ${song1}, immediately hooking the listener. Just when you think you know where it's going, it pivots beautifully into the raw emotion of ${song2}. Finally, it closes out with ${song3}, leaving you hitting the replay button. A flawless 5/5 stars. 🌟🌟🌟🌟🌟`,
        `A total rollercoaster of vibes! I wasn't sure how ${song1} would blend with ${song2}, but it somehow creates the perfect soundtrack for a late-night drive. The inclusion of ${song3} as the anchor track proves Alex has elite musical taste. Highly recommended! 🔥🔥🔥`,
        `An eclectic masterpiece. Starting with ${song1} sets a bold, cinematic tone. It then transitions smoothly into ${song2}, bringing the tempo exactly where it needs to be. Ending on ${song3} is a brilliant choice that ties the whole room together. This is playlist perfection! 🎧✨`
    ];

    const randomReview = reviews[Math.floor(Math.random() * reviews.length)];
    const titles = ["The Midnight Drive", "Elite Taste", "A Sonic Journey", "Curator's Masterpiece", "The Vibe Check"];
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];

    document.getElementById('review-title').innerText = `Review: ${randomTitle}`;
    document.getElementById('review-content').innerHTML = `
        <p style="text-align: left; font-style: italic; background: rgba(108, 92, 231, 0.05); padding: 15px; border-radius: 12px; border-left: 4px solid #6c5ce7;">
            "${randomReview}"
        </p>
        
        <div style="margin-top: 25px; padding: 20px; background: var(--input-bg); border-radius: 12px; border: 1px solid var(--border-color); text-align: left; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
            <strong style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Featured Tracklist:</strong>
            <ol style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; font-weight: 500;">
                <li style="margin-bottom: 5px;">${mix[0].trackName} <span style="font-weight: normal; color: var(--text-muted);">by ${mix[0].artistName}</span></li>
                <li style="margin-bottom: 5px;">${mix[1].trackName} <span style="font-weight: normal; color: var(--text-muted);">by ${mix[1].artistName}</span></li>
                <li>${mix[2].trackName} <span style="font-weight: normal; color: var(--text-muted);">by ${mix[2].artistName}</span></li>
            </ol>
        </div>
    `;

    document.getElementById('review-modal').style.display = 'flex';
}

// --- Enter Key Support ---
const enterArtistInput = document.getElementById('artist');
const enterSongInput = document.getElementById('song');

if (enterArtistInput) {
    enterArtistInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); 
            searchLyrics();
        }
    });
}

if (enterSongInput) {
    enterSongInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); 
            searchLyrics();
        }
    });
}

// --- CLEANED ADMOB CODE ---
async function showBannerAd() {
  try {
    const AdMob = window.Capacitor.Plugins.AdMob;
    if (!AdMob) return; // Prevents crash if running in web browser

    await AdMob.initialize();
    
    const options = {
      adId: 'ca-app-pub-5961941203824246~9523623727', // Make sure this is your Ad Unit ID, not App ID!
      adSize: 'BANNER',
      position: 'BOTTOM_CENTER',
      margin: 0,
      isTesting: false 
    };

    await AdMob.showBanner(options);
  } catch (error) {
    console.log("AdMob Error:", error);
  }
}

// Show the ad 1 second after load
window.addEventListener('load', () => setTimeout(showBannerAd, 1000));


// ==========================================
// CRITICAL: MAKE FUNCTIONS VISIBLE TO HTML
// Because we use `type="module"`, we must manually expose these to the window
// ==========================================
window.searchLyrics = searchLyrics;
window.startAndroidVoiceSearch = startAndroidVoiceSearch;
window.saveCurrentShazam = saveCurrentShazam;
window.loadSavedShazam = loadSavedShazam;
window.generatePlaylistReview = generatePlaylistReview;

// ... all your other app.js code ...
// ... your button clicks ...
// ... your iTunes API fetch code ...

// 🛑 PASTE THIS AT THE VERY BOTTOM OF THE FILE:
function unlockMicFeature() {
    console.log("Ad finished! Unlocking Mic.");
    
    // You will eventually put your voice recognition code right here
    // recognition.start();
}