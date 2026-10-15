"use client";

import React, { useEffect } from "react";

const EmbedSurvey: React.FC = () => {
  useEffect(() => {
    const survey123webform = document.getElementsByName(
      "survey123webform"
    )[0] as HTMLIFrameElement;

    const handleMessage = (e: MessageEvent) => {
      if (e.data) {
        try {
          const data = JSON.parse(e.data);
          const events = [
            "survey123:webform:formLoaded",
            "survey123:onFormLoaded",
          ];

          if (events.includes(data.event) && data.contentHeight) {
            const parentNode = survey123webform.parentNode as HTMLElement;
            parentNode.style.height = `${data.contentHeight}px`;
            parentNode.style.paddingBottom = "unset";
          }
        } catch (err) {
          console.error("Error parsing message data:", err);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <div className="mywrapper">
      <div className="relative h-0 pb-[80%] max-w-full">
        <iframe
          name="survey123webform"
          width="500"
          height="400"
          frameBorder="0"
          marginHeight={0}
          marginWidth={0}
          title="GBC 1.0 Reservation Form"
          src="//survey123.arcgis.com/share/dd733c292be142d4afcb5c3a1d0829fe"
          allow="geolocation https://survey123.arcgis.com; camera https://survey123.arcgis.com"
          className="absolute top-0 left-0 w-full h-full"
        />
        <small className="absolute z-40 bottom-0 mb-[-15px]"></small>
      </div>
    </div>
  );
};

export default EmbedSurvey;
