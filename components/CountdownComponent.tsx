"use client";

import React from "react";
import Countdown, { CountdownRenderProps } from "react-countdown";

export const CountdownComponent: React.FC = () => {
  // Random component for completion state
  const Completionist: React.FC = () => (
    <div className="my-5 md:justify-start w-full justify-between items-center lg:gap-[29px] gap-[15px] flex">
      <div className="flex-col justify-start items-center inline-flex">
        <span className="text-center text-[#001f3f] lg:text-5xl md:text-2xl text-xl font-semibold font-['Bricolage Grotesque']">
          It's the D-day!
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
      // Render a completed state
      return <Completionist />;
    } else {
      // Render a countdown
      return (
        <div className="my-5 md:justify-start w-full justify-between items-center lg:gap-[29px] gap-[15px] flex">
          <div className="flex-col justify-start items-center inline-flex">
            <span className="text-center text-[#001f3f] lg:text-5xl md:text-2xl text-xl font-semibold font-['Bricolage Grotesque']">
              {days}
            </span>
            <span className="text-center text-[#001f3f] lg:text-xl text-sm font-medium font-['Bricolage Grotesque']">
              Days
            </span>
          </div>
          <span className="text-center text-[#001f3f] lg:text-7xl text-2xl font-bold font-['Nunito']">
            :
          </span>
          <div className="flex-col justify-start items-center inline-flex">
            <span className="text-center text-[#001f3f] lg:text-5xl md:text-2xl text-xl font-semibold font-['Bricolage Grotesque']">
              {hours}
            </span>
            <span className="text-center text-[#001f3f] lg:text-xl text-sm font-medium font-['Bricolage Grotesque']">
              Hours
            </span>
          </div>
          <span className="text-center text-[#001f3f] lg:text-7xl text-2xl font-bold font-['Nunito']">
            :
          </span>
          <div className="flex-col justify-start items-center inline-flex">
            <span className="text-center text-[#001f3f] lg:text-5xl md:text-2xl text-xl font-semibold font-['Bricolage Grotesque']">
              {minutes}
            </span>
            <span className="text-center text-[#001f3f] lg:text-xl text-sm font-medium font-['Bricolage Grotesque']">
              Mins
            </span>
          </div>
          <span className="text-center text-[#001f3f] lg:text-7xl text-2xl font-bold font-['Nunito']">
            :
          </span>
          <div className="flex-col justify-start items-center inline-flex">
            <span className="text-center text-[#001f3f] lg:text-5xl md:text-2xl text-xl font-semibold font-['Bricolage Grotesque']">
              {seconds}
            </span>
            <span className="text-center text-[#001f3f] lg:text-xl text-sm font-medium font-['Bricolage Grotesque']">
              Secs
            </span>
          </div>
        </div>
      );
    }
  };
  return (
    <Countdown autoStart date={Date.now() + 6000000000} renderer={renderer} />
  );
};
