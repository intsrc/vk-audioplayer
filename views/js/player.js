const {ipcRenderer} = require('electron')
let plr = require('../custom_modules/player.js')

let Player = new plr()

// JQuery style :)
// It'll be tested later
// let $ = function (selector) {
//   return document.querySelector(selector);
// }
let forEach = (array, callback, scope) => {
  for (var i = 0; i < array.length; i++) {
    callback.call(scope, i, array[i]); // passes back stuff we need
  }
}

ipcRenderer.on('tracks-received', (event, playlist) => {
  if (playlist.response.items.length > 0) {
    Player.owner = playlist.response.items.splice(0, 1);
    Player.playlist = playlist.response.items
  }

  let playlistHtml = ''
  Player.playlist.forEach((item) => {
    playlistHtml += `
      <div class="song">
        <div class="player-controls">
          <div class="play-button" id='play-btn' data-aid='${item.id}'></div>
          <div class="pause-button" id='pause-btn' data-aid='${item.id}'></div>
        </div>
        <div class="song-details">
          <div class="song-name">
            ${item.artist} - ${item.title}
          </div>
        </div>
        <div class="download-button"></div>
      </div>
      <div class="divider"></div>
    `
  })
  let songsDiv = document.getElementsByClassName('songs')[0]
  songsDiv.innerHTML = songsDiv.innerHTML + playlistHtml

  let nowPlaying = document.getElementsByClassName('now-playing')[0]
  nowPlaying.innerHTML = `
    <div class="player-controls">
      <div class="play-button" id='now-playing' data-aid='${Player.playlist[0].id}'></div>
      <div class="pause-button" id='pause-now-playing' data-aid='${Player.playlist[0].id}'></div>
      <div class="next-button"></div>
    </div>
    <div class="song-details">
      <div class="song-name" id="now-playing-title">
        ${Player.playlist[0].artist} - ${Player.playlist[0].title}
      </div>
      <div class="song-progress">
        <div class="progress-completed" id='song-completed'></div>
        <div class="progress-control" id='song-control'></div>
      </div>
    </div>
    <div class="volume-control">
      <div class="volume-progress">
        <div class="progress-completed" id='volume-completed' ></div>
        <div class="progress-control" id='volume-control'></div>
      </div>
    </div>
    <div class="download-button"></div>
  `
})

document.addEventListener("DOMContentLoaded", () => {

  let songControl = document.getElementById("song-control")
  let songBar = document.getElementsByClassName("song-progress")[0]
  let songBarRanges = songBar.getBoundingClientRect()
  let songDotRanges = songControl.getBoundingClientRect()
  let songCompleted = document.getElementById("song-completed")

  let volumeControl = document.getElementById("volume-control")
  let volumeBar = document.getElementsByClassName("volume-progress")[0]
  let volumeBarRanges = volumeBar.getBoundingClientRect()
  let volumeDotRanges = volumeControl.getBoundingClientRect()
  let volumeCompleted = document.getElementById("volume-completed")
  let moving = false;

  let CalculatePlayed = (element, bar) => {
    let dot = (element.id === 'song-completed')
      ? songControl.getBoundingClientRect()
      : volumeControl.getBoundingClientRect()
    element.style.width = ((((dot.left - bar.left) * 100) / bar.width) + 2) + '%'
  }

  let ControlVisibility = (element, cond = true) => {
    if (!moving) {
      cond === true ? element.style.display = 'block' : element.style.display = 'none'
    }
  }

  songBar.onmouseover     = ControlVisibility.bind(null, songControl,   true)
  volumeBar.onmouseover   = ControlVisibility.bind(null, volumeControl, true)
  songBar.onmouseout      = ControlVisibility.bind(null, songControl,   false)
  volumeBar.onmouseout    = ControlVisibility.bind(null, volumeControl, false)


  let HandleMovement = (event, bar, barRanges, dotRanges, songControl, progress) => {
    event = event || window.event
    moving = true
    document.onmousemove = (e) => {
        e = e || window.event
        let end = 0
        if (!e.pageX) {
          end = e.clientX
        }
        end = e.pageX
        end > (barRanges.right - 5) ? end = (barRanges.right - 5) : end
        end < barRanges.left ? end = barRanges.left : end
        diff = end-bar.offsetLeft
        songControl.style.left =  (diff - (dotRanges.width / 2)) + "px"
        CalculatePlayed(progress, barRanges)
    }
    document.onmouseup = () => {
        CalculatePlayed(progress, barRanges)
        moving = false
        document.onmousemove = document.onmouseup = null
    }
  }

  let SwitchButtons = (elementToDisplay, aid) => {
    let buttons = document.querySelectorAll(`.pause-button[data-aid="${aid}"], .play-button[data-aid="${aid}"]`)
    forEach(buttons, (index, item) => {
      (item.classList[0] == elementToDisplay) ? item.style.display = 'block' : item.style.display = 'none'
    })
  }

  let ResetButtons = () => {
    forEach(document.querySelectorAll('.pause-button, .play-button'), (index, item) => {
      (item.classList[0] == 'play-button') ? item.style.display = 'block' : item.style.display = 'none'
    })
  }

  let ToggledPlay = (element) => {
    ResetButtons()
    let nowPlaying = document.getElementById('now-playing')
    if (nowPlaying.dataset.aid != element.dataset.aid) {
      let song = Player.getSong(element.dataset.aid)[0]
      console.log('aid = ' + element.dataset.aid)
      console.log('song = ' + song)
      document.getElementById('pause-now-playing').dataset.aid = nowPlaying.dataset.aid = song.id
      document.getElementById('now-playing-title').innerHTML = `${song.artist} - ${song.title}`
    }
    SwitchButtons('pause-button', element.dataset.aid)
    Player.play(element.dataset.aid)
  }

  let ToggledPause = (element) => {
    SwitchButtons('play-button', element.dataset.aid)
    Player.stop()
  }

  document.addEventListener('click', (e) => {
    if (e.target) {
      if (e.target.classList[0] == 'play-button' ) ToggledPlay(e.target)
      if (e.target.classList[0] == 'pause-button' ) ToggledPause(e.target)
    }
  })


  songControl.onmousedown   = HandleMovement.bind(null, event, songBar,   songBarRanges,   songDotRanges,   songControl,   songCompleted)
  volumeControl.onmousedown = HandleMovement.bind(null, event, volumeBar, volumeBarRanges, volumeDotRanges, volumeControl, volumeCompleted)
})
