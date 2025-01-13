import { FacebookIcon, InstagramIcon, LinkedInIcon, TwitterIcon } from "./svgs";

const FeaturedNews = () => {
  return (
    <div className="mywrapper min-h-[2004.43px] py-[71px] bg-white flex-col justify-start items-center gap-[47px] inline-flex">
      <div className="flex-col justify-start items-center gap-5 flex">
        <div className="flex-col justify-start items-center gap-[15px] flex">
          <div className="justify-start items-center gap-[15px] inline-flex">
            <div className="w-5 h-[0px] border-2 border-[#001f3f]"></div>
            <div className="text-[#001f3f] text-xl font-medium leading-[34px]">
              Our News
            </div>
          </div>
          <div className="flex-col justify-start items-start gap-[18px] flex">
            <div className="text-center text-[#0c0e12] text-[28px] lg:text-[32px] font-extrabold leading-[54px]">
              Featured News
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-20">
        <div className="self-stretch flex-col justify-start items-start gap-4 flex">
          <div className="self-stretch flex-col justify-start items-start gap-[10px] flex">
            <div className="self-stretch flex-col justify-start items-start gap-6 flex">
              <div className="self-stretch text-[#0c0e12] text-lg font-medium">
                November 23rd, 2024 Location- Marriott Hotel, Ikeja, Lagos
              </div>
              <div className="self-stretch text-[#0c0e12] text-4xl font-semibold leading-[70px]">
                GBC 1.0: Demystifying GIS for Surveyors
              </div>
            </div>
            <div className="self-stretch">
              <span className="text-[#0c0e12] text-xl font-normal leading-[30px]">
                <b>The Geospatial Builders Course (GBC)</b> is a program
                dedicated to fostering geospatial capacity-building across
                industries. This maiden edition, themed "Demystifying GIS for
                Surveyors," brought together surveyors and geospatial
                enthusiasts for a day of learning, innovation, and connection.
                <br />
                <i className="mt-6 italic block underline">
                  Highlights of the Event Expository Session:
                </i>
                A Journey Through GIS The Expository Session kicked off with an
                exploration of the rich history and evolution of GIS, tracing
                its humble beginnings to its present status as a transformative
                powerhouse. Attendees were introduced to the latest GIS trends
                and inspired by the story of the resilient surveyor—a
                professional who adapts, innovates, and thrives by leveraging
                GIS to confront challenges and deliver actionable insights.
                <br />
                <br />A pivotal moment was an inspiring video from ESRI FedGIS
                2024 featuring Jess Altamira, which showcased the incredible
                potential of big data analytics in GIS. The session demonstrated
                how GIS is revolutionizing the surveying profession, enabling
                surveyors to:
              </span>
              <ul className="text-[#0c0e12] text-xl font-normal leading-[30px] list-inside list-disc p-3">
                <li>- Analyze millions of parcels across the U.S.</li>
                <li>- Conduct real-time analyses on a national scale.</li>
                <li>- Empower land conservation and ownership initiatives.</li>
              </ul>

              <span>
                💡 Key Takeaway: GIS equips surveyors with the tools to make
                smarter, faster decisions at scale, transforming the way we
                understand and interact with the world.
              </span>
            </div>
          </div>
          <div className="w-full gap-8 flex flex-col items-center justify-center">
            {/* <img
            className="max-w-full self-center max-h-[501.43px]"
            src="/fea1.png"
          /> */}
            {/* <div className="max-w-full w-full justify-evenly gap-7 items-center flex flex-wrap">
            <img
              className="w-full max-w-[570px] max-h-[430px]"
              src="/fea2.png"
            />

            <img
              className="w-full max-w-[570px] max-h-[430px]"
              src="/fea3.png"
            />
          </div> */}
          </div>
          <div className="w-full md:justify-between items-center flex flex-wrap gap-3">
            <div className="justify-start items-center gap-[25px] flex">
              <img
                className="w-[61px] h-[61px] rounded-full"
                src="feaAvatar.png"
              />
              <div className="flex-col justify-start items-start gap-[5px] inline-flex">
                <div className="self-stretch text-[#4e5055] text-base font-normal">
                  Author
                </div>
                <div className="text-[#0c0e12] text-xl font-semibold">
                  TwoNode Technologies
                </div>
              </div>
            </div>

            <div className="justify-end items-center gap-3 flex">
              <LinkedInIcon />
              <FacebookIcon />
              <TwitterIcon />
              <InstagramIcon />
            </div>
          </div>

          <div className="w-full h-[0px] opacity-50 border border-[#4e5055]"></div>
        </div>

        <div className="self-stretch flex-col justify-start items-start gap-10 flex">
          <div className="self-stretch flex-col justify-start items-start gap-[10px] flex">
            <div className="self-stretch flex-col justify-start items-start gap-6 flex">
              <div className="self-stretch text-[#0c0e12] text-lg font-medium">
                Wednesday, July 17, 2024 · 2 Min Read
              </div>
              <div className="self-stretch text-[#0c0e12] text-4xl font-semibold leading-[70px]">
                Same Subscription with more capabilities with ArcGIS Pro and
                ArcOnline licenses.
              </div>
            </div>
            <div className="self-stretch">
              <span className="text-[#0c0e12] text-xl font-normal leading-[30px]">
                TwoNode Technologies is thrilled to announce a long-term
                partnership with sambus geospatial, the official distributor for
                ESRI products. <br />
                This partnership is to provide ultra-specific capabilities{" "}
                <b className="text-2xl italic inline-block">
                  beyond your imagination.
                </b>
                <br />
                What you stand to benefit:
                <br />
              </span>
              <ul className="text-[#0c0e12] text-xl font-normal leading-[30px] list-inside list-disc p-3">
                <li>
                  ArcGIS Pro Advanced, extensions, and dozens of ready-to-use
                  apps
                </li>
                <li>
                  ArcGIS Living Atlas of the World with maps and data on
                  thousands of topics, including access to foundational content
                  from Esri{" "}
                </li>
                <li>Software updates</li>
                <li>
                  Unlimited access to self-paced e-learning through the Esri
                  Training website
                </li>
              </ul>
            </div>
          </div>
          <div className="w-full gap-8 flex flex-col items-center justify-center">
            <img
              className="max-w-full self-center max-h-[501.43px]"
              src="/fea1.png"
            />
            <div className="max-w-full w-full justify-evenly gap-7 items-center flex flex-wrap">
              <img
                className="w-full max-w-[570px] max-h-[430px]"
                src="/fea2.png"
              />

              <img
                className="w-full max-w-[570px] max-h-[430px]"
                src="/fea3.png"
              />
            </div>
          </div>
          <div className="w-full md:justify-between items-center flex flex-wrap gap-3">
            <div className="justify-start items-center gap-[25px] flex">
              <img
                className="w-[61px] h-[61px] rounded-full"
                src="feaAvatar.png"
              />
              <div className="flex-col justify-start items-start gap-[5px] inline-flex">
                <div className="self-stretch text-[#4e5055] text-base font-normal">
                  Author
                </div>
                <div className="text-[#0c0e12] text-xl font-semibold">
                  TwoNode Technologies
                </div>
              </div>
            </div>

            <div className="justify-end items-center gap-3 flex">
              <LinkedInIcon />
              <FacebookIcon />
              <TwitterIcon />
              <InstagramIcon />
            </div>
          </div>
          <div className="w-full h-[0px] opacity-50 border border-[#4e5055]"></div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedNews;
