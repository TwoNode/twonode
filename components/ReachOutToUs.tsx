export const ReachOutToUs = () => {
  return (
    <div className="mywrapper w-full min-h-[929px] px-[135px] py-[75px] bg-gray-50 flex-col justify-center items-start gap-12 inline-flex">
      <div className="w-full grid lg:grid-cols-2 grid-cols-1 justify-items-center gap-[50px]">
        <div className="max-w-[571px] w-full min-h-[738px] px-[50px] py-[34px] bg-white rounded-[10px] shadow justify-center items-center gap-2.5 flex">
          <div className="flex-col justify-start items-start gap-[30px] inline-flex w-full">
            <div className="flex-col justify-start items-start gap-[15px] flex w-full">
              <div className="flex-col justify-start items-start gap-2.5 flex w-full">
                <div className="justify-start items-center gap-[15px] inline-flex">
                  <div className="w-5 h-[0px] border-2 border-sky-950"></div>
                  <h2 className="text-sky-950 text-xl font-medium leading-[34px]">
                    Get In Touch
                  </h2>
                </div>
                <div className="self-stretch flex-col justify-start items-start gap-[18px] flex w-full">
                  <h3 className="text-sky-950 text-[40px] font-extrabold">
                    You Can Reach Out To Us!
                  </h3>
                </div>
              </div>
              <div className="max-w-[498px] text-sky-950 text-[15px] font-normal leading-tight">
                Discover how our innovative GIS solution revolutionizes the
                representation of extent and survey information.
              </div>
            </div>
            <div className="flex-col justify-start items-start gap-6 flex w-full">
              <div className="flex-col w-full justify-start items-start gap-[15px] flex">
                <div className="self-stretch text-sky-950 text-base font-medium leading-7">
                  Name
                </div>
                <input
                  type="text"
                  placeholder="Enter Name"
                  className="max-w-[520px] w-full px-5 py-3.5 rounded-[5px] border border-zinc-200 text-neutral-600 text-base font-normal leading-7"
                />
              </div>
              <div className="flex-col justify-start items-start gap-[15px] flex w-full">
                <div className="self-stretch text-sky-950 text-base font-medium leading-7">
                  Email Address
                </div>
                <input
                  type="email"
                  placeholder="Enter Email Address"
                  className="max-w-[520px] w-full px-5 py-3.5 rounded-[5px] border border-zinc-200 text-neutral-600 text-base font-normal leading-7"
                />
              </div>
              <div className="flex-col justify-start items-start gap-[15px] flex w-full">
                <div className="self-stretch text-sky-950 text-base font-medium leading-7">
                  Your Message
                </div>
                <textarea
                  placeholder="Enter Message"
                  className="max-w-[520px] w-full min-h-[138px] px-5 py-3.5 rounded-[5px] border border-zinc-200 text-neutral-600 text-base font-normal leading-7"
                />
              </div>
            </div>
            <div className="w-full flex-col justify-start items-start gap-5 flex">
              <button className="max-w-[520px] w-full px-[45px] py-[15px] bg-sky-950 rounded-[30px] text-white text-lg font-semibold leading-[30px]">
                Submit
              </button>
            </div>
          </div>
        </div>
        <img src="reachout.png" className="max-w-[530px] max-h-[738px] w-full h-full bg-black rounded-lg" />
      </div>
    </div>
  );
};
