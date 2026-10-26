
const songName = document.getElementById("song-name");
const songLink = document.getElementById("song-link");
const addButton = document.getElementById("add-song");
const songList = document.getElementById("song-list");
const songCount = document.getElementById("song-count");
const message = document.getElementById("message");

const player = document.getElementById("player");
const playingName = document.getElementById("playing-name");
const playerContent = document.getElementById("player-content");

const STORAGE_KEY = "melody-music-library";

let songs = [];
let currentView = "home";


try {
    const savedSongs = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
    );

    if (Array.isArray(savedSongs)) {
        songs = savedSongs.filter(song =>
            song &&
            typeof song.url === "string" &&
            typeof song.platform === "string" &&
            ["youtube", "spotify"].includes(song.platform)
        ).slice(0, 100);
    }
} catch (error) {
    songs = [];
}

function saveSongs() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(songs)
        );

        return true;
    } catch (error) {
        message.textContent =
            "Could not save to browser storage.";
        return false;
    }
}


function getSongDetails(link) {
    let url;

    try {
        url = new URL(link);
    } catch (error) {
        return null;
    }

    const host = url.hostname
        .toLowerCase()
        .replace(/^www\./, "");

    
    const youtubeHosts = [
        "youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtu.be"
    ];

    if (youtubeHosts.includes(host)) {
        let videoId = "";

        if (host === "youtu.be") {
            videoId = url.pathname
                .split("/")
                .filter(Boolean)[0] || "";
        } else if (url.pathname === "/watch") {
            videoId = url.searchParams.get("v") || "";
        } else if (/^\/(embed|shorts|live)\//.test(url.pathname)) {
            videoId = url.pathname.split("/")[2] || "";
        }

        if (videoId && /^[\w-]{6,20}$/.test(videoId)) {
            return {
                platform: "youtube",
                embed:
                    "https://www.youtube-nocookie.com/embed/" +
                    videoId,
                title: "YouTube video"
            };
        }

        if (
            url.pathname === "/playlist" &&
            url.searchParams.has("list")
        ) {
            return {
                platform: "youtube",
                embed:
                    "https://www.youtube-nocookie.com/embed/videoseries?list=" +
                    encodeURIComponent(url.searchParams.get("list")),
                title: "YouTube playlist"
            };
        }

        return null;
    }

    
    if (host === "open.spotify.com") {
        const match = url.pathname.match(
            /^\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)\/?$/
        );

        if (!match) {
            return null;
        }

        return {
            platform: "spotify",
            embed:
                "https://open.spotify.com/embed/" +
                match[1] + "/" + match[2],
            title: "Spotify " + match[1]
        };
    }

    return null;
}


addButton.addEventListener("click", function () {
    const link = songLink.value.trim();
    const name = songName.value.trim();

    if (!link) {
        message.textContent = "Please paste a song link.";
        return;
    }

    const details = getSongDetails(link);

    if (!details) {
        message.textContent =
            "Enter a supported YouTube or Spotify link.";
        return;
    }

    if (songs.some(song => song.url === link)) {
        message.textContent = "This song is already in your library.";
        return;
    }

    if (songs.length >= 100) {
        message.textContent = "Your library is full.";
        return;
    }

    songs.unshift({
        url: link,
        name: name || details.title,
        title: details.title,
        platform: details.platform,
        embed: details.embed,
        favorite: false
    });

    const saved = saveSongs();

    songName.value = "";
    songLink.value = "";

    currentView = "library";
    updateNavigation();
    renderSongs();

    message.textContent = saved
        ? "Song added successfully! ♡"
        : "Song added for this session, but it could not be saved.";
});


function renderSongs() {
    const visibleSongs = songs
        .map((song, index) => ({ ...song, index }))
        .filter(song => {
            if (currentView === "favorites") {
                return song.favorite;
            }

            return true;
        });

    document.getElementById("list-title").textContent =
        currentView === "favorites"
            ? "Your Favorites"
            : currentView === "library"
            ? "My Library"
            : "Your Collection";

    document.getElementById("add-section").classList.toggle(
        "hidden",
        currentView === "favorites"
    );

    songCount.textContent =
        visibleSongs.length +
        (visibleSongs.length === 1 ? " song" : " songs");

    if (visibleSongs.length === 0) {
        songList.innerHTML = `
            <p class="empty">
                🎧 No songs here yet!<br>
                Add some music to get started.
            </p>
        `;
        return;
    }

    songList.innerHTML = visibleSongs.map(song => `
        <div class="song-card">

            <div class="song-icon">
                ${song.platform === "spotify" ? "♫" : "▶"}
            </div>

            <div class="song-info">
                <h3>${escapeHTML(song.name)}</h3>
                <p>
                    ${song.platform.toUpperCase()}
                    ${song.favorite ? " · ♥ FAVORITE" : ""}
                </p>
            </div>

            <div class="song-actions">
                <button data-action="play" data-index="${song.index}">
                    Play
                </button>

                <button
                    data-action="favorite"
                    data-index="${song.index}"
                    aria-label="Toggle favorite"
                >
                    ${song.favorite ? "♥" : "♡"}
                </button>

                <button
                    data-action="delete"
                    data-index="${song.index}"
                    aria-label="Delete song"
                >
                    ×
                </button>
            </div>

        </div>
    `).join("");
}


function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, function (char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char];
    });
}


function playSong(index) {
    const song = songs[index];

    if (!song) {
        return;
    }

    player.classList.remove("hidden");
    playingName.textContent = song.name;
    playerContent.replaceChildren();

    if (!song.embed) {
        playingName.textContent =
            "This link cannot be embedded. Open the original platform instead.";

        const link = document.createElement("a");
        link.href = song.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open Spotify";

        playerContent.appendChild(link);
        return;
    }

    const iframe = document.createElement("iframe");

    iframe.title = song.platform + " music player";
    iframe.src = song.embed;
    iframe.width = "100%";
    iframe.height = song.platform === "spotify" ? "152" : "220";
    iframe.loading = "lazy";
    iframe.allow =
        "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    playerContent.appendChild(iframe);

    player.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}


songList.addEventListener("click", function (event) {
    const button = event.target.closest("button");

    if (!button) {
        return;
    }

    const index = Number(button.dataset.index);
    const action = button.dataset.action;

    if (!Number.isInteger(index) || !songs[index]) {
        return;
    }

    if (action === "play") {
        playSong(index);
    }

    if (action === "favorite") {
        songs[index].favorite = !songs[index].favorite;
        saveSongs();
        renderSongs();
    }

    if (action === "delete") {
        songs.splice(index, 1);
        saveSongs();
        renderSongs();

        player.classList.add("hidden");
        playerContent.replaceChildren();

        message.textContent = "Song removed from your library.";
    }
});


document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", function () {
        currentView = this.dataset.view;

        updateNavigation();
        renderSongs();
    });
});

function updateNavigation() {
    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === currentView
        );
    });
}


document.getElementById("close-player")
    .addEventListener("click", function () {
        playerContent.replaceChildren();
        player.classList.add("hidden");
    });


updateNavigation();
renderSongs();

