# YouTubeContent.js

This content script is injected directly into YouTube.com to render customized "Play in Aardvark" overlay buttons onto video thumbnails and titles.
It extracts video metadata directly from YouTube's complex DOM structures and communicates playback intent to the background `YouTubeService` via the Chrome messaging API. It utilizes a reliable queueing mechanism to hold commands if the player app takes time to boot.