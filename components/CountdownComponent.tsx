"use client";

import React, { useEffect, useState } from "react";
import Countdown, { CountdownRenderProps } from "react-countdown";

export const CountdownComponent: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);

  // Ensure the component only renders after mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Random component for completion state
  // const Completionist: React.FC = () => (
  //   <div className="my-5 md:justify-start w-full justify-between items-center lg:gap-[29px] gap-[15px] flex">
  //     <div className="flex-col justify-start items-center inline-flex">
  //       <span className="text-center text-[#001f3f] lg:text-5xl md:text-2xl text-xl font-semibold">
  //         It's the D-day!
  //       </span>
  //     </div>
  //   </div>
  // );

  const Completionist: React.FC = () => (
    <div className="my-5 md:justify-start w-full justify-between items-center lg:gap-[29px] gap-[15px] flex">
      <div className="flex-col justify-start items-center inline-flex">
        <span className="text-center text-[#001f3f] lg:text-3xl md:text-2xl text-xl font-semibold">
          The GBC 1.0 event was a Success
        </span>
      </div>
    </div>
  );

  // Renderer callback with condition
  const renderer = ({
    days,
    hours,
    minutes,
    seconds,
    completed,
  }: CountdownRenderProps) => {
    if (completed) {
      return <Completionist />;
    } else {
      return (
        <div className="my-5 md:justify-start w-full justify-between items-center lg:gap-[29px] gap-[15px] flex">
          <div className="flex-col justify-start items-center inline-flex">
            <span className="text-center text-[#001f3f] lg:text-5xl md:text-2xl text-xl font-semibold">
              {days}
            </span>
            <span className="text-center text-[#001f3f] lg:text-xl text-sm font-medium">
              Days
            </span>
          </div>
          <span className="text-center text-[#001f3f] lg:text-7xl text-2xl font-bold font-['Nunito']">
            :
          </span>
          <div className="flex-col justify-start items-center inline-flex">
            <span className="text-center text-[#001f3f] lg:text-5xl md:text-2xl text-xl font-semibold">
              {hours}
            </span>
            <span className="text-center text-[#001f3f] lg:text-xl text-sm font-medium">
              Hours
            </span>
          </div>
          <span className="text-center text-[#001f3f] lg:text-7xl text-2xl font-bold font-['Nunito']">
            :
          </span>
          <div className="flex-col justify-start items-center inline-flex">
            <span className="text-center text-[#001f3f] lg:text-5xl md:text-2xl text-xl font-semibold">
              {minutes}
            </span>
            <span className="text-center text-[#001f3f] lg:text-xl text-sm font-medium">
              Mins
            </span>
          </div>
          <span className="text-center text-[#001f3f] lg:text-7xl text-2xl font-bold font-['Nunito']">
            :
          </span>
          <div className="flex-col justify-start items-center inline-flex">
            <span className="text-center text-[#001f3f] lg:text-5xl md:text-2xl text-xl font-semibold">
              {seconds}
            </span>
            <span className="text-center text-[#001f3f] lg:text-xl text-sm font-medium">
              Secs
            </span>
          </div>
        </div>
      );
    }
  };

  // Render countdown only after the component has mounted
  if (!isMounted) return null;

  return (
    <Countdown
      autoStart
      date={new Date("2024-11-23T09:00:00")}
      renderer={renderer}
    />
  );
};
