import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

// Generate a random ID for users
function randomID(len) {
  let result = '';
  const chars = '12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP';
  const maxPos = chars.length;
  len = len || 5;
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return result;
}

// Extract URL parameters
export function getUrlParams(url = window.location.href) {
  let urlStr = url.split('?')[1];
  return new URLSearchParams(urlStr);
}

// ZegoCloud credentials
const APP_ID = 1999831428;
const SERVER_SECRET = "26367bcc18fbbb5b648d0d965e469159";

export default function Meet() {
  const roomID = getUrlParams().get('roomID') || randomID(5);
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeCall = async () => {
      if (!containerRef.current) return;
      
      try {
        setIsLoading(true);
        
        // Generate Kit Token
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          APP_ID, 
          SERVER_SECRET, 
          roomID,
          randomID(5),  // userID
          randomID(5)   // userName
        );
        
        // Create instance object from Kit Token
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        
        // Start the call
        zp.joinRoom({
          container: containerRef.current,
          sharedLinks: [
            {
              name: 'Personal link',
              url: 
                window.location.protocol + '//' + 
                window.location.host + window.location.pathname +
                '?roomID=' +
                roomID,
            },
          ],
          scenario: {
            mode: ZegoUIKitPrebuilt.VideoConference,
          },
          // Additional optional configurations
          showScreenSharingButton: true,
          showPreJoinView: true,
          showUserList: true,
          showTurnOffRemoteCameraButton: true,
          showTurnOffRemoteMicrophoneButton: true,
        });
      } catch (error) {
        console.error("Error initializing Zego call:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      initializeCall();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [roomID]); // Re-initialize if roomID changes

  return (
    <div className="flex flex-col h-screen pt-16">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-base-100/50 z-10 pt-16">
          <div className="loading loading-spinner loading-lg text-primary"></div>
        </div>
      )}
      <div
        className="w-full h-full"
        ref={containerRef}
      ></div>
    </div>
  );
}