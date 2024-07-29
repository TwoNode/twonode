import Link from "next/link";

const SurfBoard = ({
  text = "What You Need To Know",
  showBtn = true,
  activeLink = true,
}) => {
  return (
    <section className="mywrapper w-full min-h-[1111px] py-[75px] bg-white flex-col justify-start items-center gap-2.5 inline-flex">
      <div className="flex-col justify-start items-center gap-[70px] flex">
        <div className="flex-col justify-start items-center gap-5 flex">
          <div className="flex-col justify-start items-center gap-[15px] flex">
            <div className="justify-start items-center gap-[15px] inline-flex">
              <div className="w-5 h-[0px] border-2 border-sky-950"></div>
              <h2 className="text-sky-950 text-xl font-medium leading-[34px]">
                {text}
              </h2>
            </div>
            <div className="flex-col justify-start items-start gap-[18px] flex">
              <h3 className="text-center text-zinc-950 text-[40px] lg:text-[35px] md:text-[50px] font-extrabold leading-[54px]">
                SurfBoard
              </h3>
            </div>
          </div>
          <div className="max-w-[1019px] text-center text-neutral-600 text-lg font-normal leading-[30px]">
            A Geographic Information System (GIS) solution meticulously designed
            to present survey-based information in a user-friendly manner,
            facilitating convenient access, efficient management, and the
            extraction of valuable data-driven insights for enhanced
            decision-making processes.
          </div>
        </div>
        <div className="flex-col justify-start items-center gap-12 flex">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[30px]">
            <img
              className="max-w-full w-full max-h-full rounded-[10px]"
              src="/surfboardGlobe.png"
            />
            <div className="min-h-[434px] justify-center items-start gap-[30px] grid grid-cols-1 lg:grid-cols-2">
              {activeLink ? (
                <>
                  <Link
                    target="_blank"
                    href={"https://survey123.arcgis.com/surveys"}
                    className="hover:bg-[#00000050] p-3 flex-col justify-start items-center gap-6 inline-flex"
                  >
                    <img className="max-w-16 h-16" src="/smartForms.png" />
                    <div className="flex-col justify-start items-center gap-3 flex">
                      <div className="max-w-[270px] text-center text-zinc-950 text-xl font-semibold leading-[30px]">
                        Smart Forms
                      </div>
                      <div className="max-w-[270px] text-center text-neutral-600 text-sm font-normal leading-normal">
                        A convenient form for you to upload PDF survey plans,
                        CAD drawings, and evidence of lodgment for all surveys
                        you have completed.
                      </div>
                    </div>
                  </Link>
                  <Link
                    target="_blank"
                    href={"https://www.arcgis.com/apps/dashboards/home"}
                    className="hover:bg-[#00000050] p-3 flex-col justify-start items-center gap-6 inline-flex"
                  >
                    <img className="w-16 h-16" src="/dashboard.png" />
                    <div className="flex-col justify-start items-center gap-3 flex">
                      <div className="w-[270px] text-center text-zinc-950 text-xl font-semibold leading-[30px]">
                        Dashboard
                      </div>
                      <div className="max-w-[270px] text-center text-neutral-600 text-sm font-normal leading-normal">
                        Analyze spatial designs and discover patterns in your
                        survey records.
                      </div>
                    </div>
                  </Link>
                  <Link
                    target="_blank"
                    href={
                      "https://www.arcgis.com/apps/instantgallery/index.html?tab=myApps"
                    }
                    className="hover:bg-[#00000050] p-3 flex-col justify-start items-center gap-6 inline-flex"
                  >
                    <img className="w-16 h-16" src="/recordViewer.png" />
                    <div className="flex-col justify-start items-center gap-3 flex">
                      <div className="max-w-[270px] text-center text-zinc-950 text-xl font-semibold leading-[30px]">
                        Record Viewer
                      </div>
                      <div className="max-w-[270px] text-center text-neutral-600 text-sm font-normal leading-normal">
                        Query your survey records efficiently by searching with
                        the plan number, survey plan name, or coordinates to get
                        specific results.
                      </div>
                    </div>
                  </Link>
                </>
              ) : (
                <>
                  <div className="hover:bg-[#00000050] p-3 flex-col justify-start items-center gap-6 inline-flex">
                    <img className="max-w-16 h-16" src="/smartForms.png" />
                    <div className="flex-col justify-start items-center gap-3 flex">
                      <div className="max-w-[270px] text-center text-zinc-950 text-xl font-semibold leading-[30px]">
                        Smart Forms
                      </div>
                      <div className="max-w-[270px] text-center text-neutral-600 text-sm font-normal leading-normal">
                        A convenient form for you to upload PDF survey plans,
                        CAD drawings, and evidence of lodgment for all surveys
                        you have completed.
                      </div>
                    </div>
                  </div>
                  <div className="hover:bg-[#00000050] p-3 flex-col justify-start items-center gap-6 inline-flex">
                    <img className="w-16 h-16" src="/dashboard.png" />
                    <div className="flex-col justify-start items-center gap-3 flex">
                      <div className="w-[270px] text-center text-zinc-950 text-xl font-semibold leading-[30px]">
                        Dashboard
                      </div>
                      <div className="max-w-[270px] text-center text-neutral-600 text-sm font-normal leading-normal">
                        Analyze spatial designs and discover patterns in your
                        survey records.
                      </div>
                    </div>
                  </div>
                  <div className="hover:bg-[#00000050] p-3 flex-col justify-start items-center gap-6 inline-flex">
                    <img className="w-16 h-16" src="/recordViewer.png" />
                    <div className="flex-col justify-start items-center gap-3 flex">
                      <div className="max-w-[270px] text-center text-zinc-950 text-xl font-semibold leading-[30px]">
                        Record Viewer
                      </div>
                      <div className="max-w-[270px] text-center text-neutral-600 text-sm font-normal leading-normal">
                        Query your survey records efficiently by searching with
                        the plan number, survey plan name, or coordinates to get
                        specific results.
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="hover:bg-[#00000050] p-3 flex-col justify-start items-center gap-6 inline-flex">
                <img className="w-16 h-16" src="/fieldsoffice.png" />
                <div className="flex-col justify-start items-center gap-3 flex">
                  <div className="max-w-[270px] text-center text-zinc-950 text-xl font-semibold leading-[30px]">
                    Field - Office Module
                  </div>
                  <div className="max-w-[270px] text-center text-neutral-600 text-sm font-normal leading-normal">
                    Coming Soon.
                  </div>
                </div>
              </div>
            </div>
          </div>
          {showBtn ? (
            <div className="w-full flex-col justify-start items-center gap-5 flex">
              <Link
                href="/signup"
                className="max-w-[470px] w-full px-[45px] py-[15px] bg-sky-950 rounded-[30px] justify-center items-center gap-2.5 inline-flex"
              >
                <div className="text-center text-white text-lg font-semibold leading-[30px]">
                  Subscribe
                </div>
              </Link>
            </div>
          ) : (
            ""
          )}
        </div>
      </div>
    </section>
  );
};

export default SurfBoard;
