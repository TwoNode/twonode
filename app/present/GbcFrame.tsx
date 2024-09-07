"use client";

import React, { useEffect } from "react";

const EmbedSurvey: React.FC = () => {
  return (
    <div className="mywrapper">
      <div className="relative h-0 pb-[80%] max-w-full">
        <iframe
          name="survey123webform"
          width="800"
          height="600"
          allowFullScreen
          title="Map Embed"
          src="https://arcg.is/fb0Pj1"
          className="absolute top-0 left-0 w-full h-full max-h-[90vh]"
        />
      </div>
    </div>
  );
};

export default EmbedSurvey;
