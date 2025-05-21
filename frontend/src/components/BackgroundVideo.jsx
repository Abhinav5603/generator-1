import React from 'react';

const BackgroundVideo = () => (
  <video
    autoPlay
    loop
    muted
    className="absolute w-full h-full object-cover opacity-30"
  >
    <source
      src="https://cdn.coverr.co/videos/coverr-typing-on-computer-keyboard-2684/1080p.mp4"
      type="video/mp4"
    />
    Your browser does not support the video tag.
  </video>
);

export default BackgroundVideo;
