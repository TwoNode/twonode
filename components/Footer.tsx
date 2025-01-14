import React from "react";
import Link from "next/link";

export const Footer: React.FC = () => {
  const Logo = (
    <svg
      width="59"
      height="74"
      viewBox="0 0 59 74"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M46.0488 0H59V13.0588H46.0488V0Z" fill="#001F3F" />
      <path d="M0 60.9412H12.9512V74H0V60.9412Z" fill="#001F3F" />
      <path
        d="M12.9512 53.6863L46.0488 20.3137L44.0137 18.2617L10.9161 51.6343L12.9512 53.6863Z"
        fill="#001F3F"
      />
    </svg>
  );

  return (
    <footer className="mywrapper w-full min-h-[505px] py-[90px] bg-white flex-col justify-start items-start gap-2.5 flex">
      <div className="w-full flex-col justify-start items-start gap-[35px] flex">
        <div className="w-full flex-col justify-start items-start gap-[33px] flex">
          <div className="w-full justify-between items-start gap-[50px] flex flex-col lg:flex-row">
            <div className="flex-col justify-start items-start gap-[25px] inline-flex">
              <div className="justify-between items- gap-1.5 flex">
                <span className="text-sky-950 text-[22px] font-bold leading-[17px]">
                  {Logo}
                </span>
                <h1 className="flex flex-col justify-between h-full">
                  <span className="text-sky-950 text-[28px] lg:text-[32px] font-bold">
                    TwoNode
                  </span>
                  <span className="text-sky-950 text-2xl font-bold">
                    &nbsp; &nbsp; Technologies
                  </span>
                </h1>
              </div>
              <div className="max-w-[378px] text-black text-base font-medium leading-normal">
                Location: 58 ,Kudirat Abiola Way Oregun, Ikeja, Lagos.
              </div>
              <div className="justify-start items-start gap-3 flex">
                <Link
                  href={
                    "https://www.linkedin.com/company/twonode-technologies-limited/about/"
                  }
                  className="w-9 h-9 relative"
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 36 36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="36" height="36" rx="18" fill="#001F3F" />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M16.7145 16.4845H18.5715V17.4095C18.839 16.8775 19.525 16.3995 20.5555 16.3995C22.531 16.3995 23 17.4585 23 19.4015V23H21V19.844C21 18.7375 20.7325 18.1135 20.0515 18.1135C19.107 18.1135 18.7145 18.786 18.7145 19.8435V23H16.7145V16.4845ZM13.285 22.915H15.285V16.3995H13.285V22.915ZM15.5715 14.275C15.5716 14.4426 15.5383 14.6086 15.4737 14.7633C15.4091 14.918 15.3143 15.0583 15.195 15.176C14.9532 15.4163 14.6259 15.5508 14.285 15.55C13.9447 15.5498 13.6182 15.4156 13.376 15.1765C13.2571 15.0584 13.1627 14.9179 13.0982 14.7632C13.0337 14.6085 13.0003 14.4426 13 14.275C13 13.9365 13.135 13.6125 13.3765 13.3735C13.6184 13.1341 13.9451 12.9999 14.2855 13C14.6265 13 14.9535 13.1345 15.195 13.3735C15.436 13.6125 15.5715 13.9365 15.5715 14.275Z"
                      fill="white"
                    />
                  </svg>
                </Link>
                <Link href={"https://x.com/TwoNodeTech"} className="w-9 h-9">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 36 36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="0.5"
                      y="0.5"
                      width="35"
                      height="35"
                      rx="17.5"
                      stroke="#001F3F"
                    />
                    <path
                      d="M20.6068 18.6247L20.9181 16.815H18.9726V15.6406C18.9726 15.1456 19.2443 14.6628 20.1156 14.6628H21V13.1222C21 13.1222 20.1976 13 19.4302 13C17.8281 13 16.781 13.8669 16.781 15.4359V16.8153H15V18.625H16.781V23H18.9726V18.625L20.6068 18.6247Z"
                      fill="#001F3F"
                    />
                  </svg>
                </Link>
                <Link
                  href={
                    "https://www.instagram.com/twonodetechnologies/?igsh=NWJneXF6eDJrMHNy&utm_source=qr"
                  }
                  className="w-9 h-9 relative"
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 36 36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="0.5"
                      y="0.5"
                      width="35"
                      height="35"
                      rx="17.5"
                      stroke="#001F3F"
                    />
                    <path
                      d="M18.0001 13C16.6421 13 16.4719 13.0058 15.9385 13.0301C15.4063 13.0544 15.0429 13.1389 14.7248 13.2625C14.396 13.3903 14.1172 13.5612 13.8392 13.8392C13.5612 14.1172 13.3903 14.396 13.2625 14.7248C13.1389 15.0429 13.0544 15.4063 13.0301 15.9385C13.0057 16.4719 13 16.6421 13 18.0001C13 19.358 13.0057 19.5283 13.0301 20.0616C13.0544 20.5938 13.1389 20.9573 13.2625 21.2753C13.3903 21.6041 13.5613 21.883 13.8392 22.161C14.1172 22.4389 14.396 22.6099 14.7248 22.7377C15.0429 22.8613 15.4063 22.9458 15.9385 22.9701C16.4719 22.9944 16.6421 23.0002 18.0001 23.0002C19.358 23.0002 19.5283 22.9944 20.0616 22.9701C20.5938 22.9458 20.9573 22.8613 21.2753 22.7377C21.6041 22.6099 21.883 22.4389 22.161 22.161C22.4389 21.883 22.6099 21.6041 22.7377 21.2753C22.8613 20.9573 22.9458 20.5938 22.9701 20.0616C22.9944 19.5283 23.0002 19.358 23.0002 18.0001C23.0002 16.6421 22.9944 16.4719 22.9701 15.9385C22.9458 15.4063 22.8613 15.0429 22.7377 14.7248C22.6099 14.396 22.4389 14.1172 22.161 13.8392C21.883 13.5612 21.6041 13.3903 21.2753 13.2625C20.9573 13.1389 20.5938 13.0544 20.0616 13.0301C19.5283 13.0058 19.358 13 18.0001 13ZM18.0001 13.9009C19.3352 13.9009 19.4933 13.906 20.0205 13.9301C20.5081 13.9523 20.7728 14.0338 20.949 14.1022C21.1824 14.1929 21.3489 14.3013 21.5239 14.4762C21.6989 14.6512 21.8072 14.8178 21.8979 15.0512C21.9664 15.2274 22.0479 15.4921 22.0701 15.9796C22.0941 16.5069 22.0993 16.665 22.0993 18.0001C22.0993 19.3352 22.0941 19.4933 22.0701 20.0205C22.0479 20.5081 21.9664 20.7728 21.8979 20.949C21.8072 21.1824 21.6989 21.3489 21.5239 21.5239C21.3489 21.6989 21.1824 21.8072 20.949 21.8979C20.7728 21.9664 20.508 22.0479 20.0205 22.0701C19.4934 22.0941 19.3353 22.0993 18.0001 22.0993C16.6649 22.0993 16.5068 22.0941 15.9796 22.0701C15.4921 22.0479 15.2274 21.9664 15.0512 21.8979C14.8178 21.8072 14.6512 21.6989 14.4763 21.5239C14.3013 21.3489 14.1929 21.1824 14.1022 20.949C14.0338 20.7728 13.9523 20.508 13.9301 20.0205C13.906 19.4933 13.9009 19.3352 13.9009 18.0001C13.9009 16.665 13.906 16.5069 13.9301 15.9796C13.9523 15.4921 14.0338 15.2274 14.1022 15.0512C14.1929 14.8178 14.3013 14.6512 14.4762 14.4763C14.6512 14.3013 14.8178 14.1929 15.0512 14.1022C15.2274 14.0338 15.4921 13.9523 15.9796 13.9301C16.5069 13.906 16.665 13.9009 18.0001 13.9009"
                      fill="#001F3F"
                    />
                    <path
                      d="M18.0005 19.6672C17.08 19.6672 16.3338 18.921 16.3338 18.0005C16.3338 17.08 17.08 16.3338 18.0005 16.3338C18.921 16.3338 19.6672 17.08 19.6672 18.0005C19.6672 18.921 18.921 19.6672 18.0005 19.6672ZM18.0005 15.4329C16.5824 15.4329 15.4329 16.5825 15.4329 18.0005C15.4329 19.4186 16.5824 20.5681 18.0005 20.5681C19.4185 20.5681 20.5681 19.4186 20.5681 18.0005C20.5681 16.5825 19.4185 15.4329 18.0005 15.4329ZM21.2695 15.3315C21.2695 15.6629 21.0009 15.9315 20.6695 15.9315C20.3382 15.9315 20.0695 15.6629 20.0695 15.3315C20.0695 15.0001 20.3382 14.7314 20.6695 14.7314C21.0009 14.7314 21.2695 15.0001 21.2695 15.3315Z"
                      fill="#001F3F"
                    />
                  </svg>
                </Link>
                <Link
                  href={"https://x.com/TwoNodeTech"}
                  className="w-9 h-9 relative"
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 36 36"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="0.5"
                      y="0.5"
                      width="35"
                      height="35"
                      rx="17.5"
                      stroke="#001F3F"
                    />
                    <path
                      d="M24 14.1838C23.5506 14.3879 23.074 14.5219 22.586 14.5813C23.0943 14.2689 23.4847 13.7741 23.6685 13.1846C23.1852 13.4787 22.6565 13.6859 22.1051 13.7972C21.656 13.3066 21.0162 13 20.3081 13C18.9484 13 17.8461 14.1303 17.8461 15.5244C17.8461 15.7223 17.8679 15.915 17.9098 16.0998C15.8637 15.9945 14.0497 14.9895 12.8354 13.4621C12.6235 13.835 12.5021 14.2687 12.5021 14.7313C12.5021 15.6071 12.9367 16.3798 13.5973 16.8325C13.2064 16.82 12.824 16.7117 12.4822 16.5167C12.482 16.5273 12.482 16.5379 12.482 16.5485C12.482 17.7716 13.3306 18.792 14.4569 19.0239C14.0943 19.125 13.714 19.1398 13.3451 19.0672C13.6583 20.0701 14.5676 20.8 15.6449 20.8204C14.8023 21.4974 13.7407 21.9011 12.5873 21.9011C12.3885 21.9011 12.1926 21.8891 12 21.8658C13.0895 22.5821 14.3836 23 15.7739 23C20.3024 23 22.7786 19.1532 22.7786 15.8172C22.7786 15.7077 22.7763 15.5988 22.7715 15.4906C23.2535 15.1333 23.6695 14.6908 24 14.1838Z"
                      fill="#001F3F"
                    />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="w-full basis-1/2 justify-between items-start gap-[50px] flex">
              <div className="flex-col justify-center items-start gap-6 inline-flex">
                <div className="text-stone-950 text-xl font-semibold">
                  Company
                </div>
                <div className="flex-col justify-start items-start gap-5 flex">
                  <Link
                    href={"/"}
                    className="text-stone-950 text-base font-normal leading-normal"
                  >
                    Home
                  </Link>
                  <Link
                    href={"about-us"}
                    className="text-stone-950 text-base font-normal leading-normal"
                  >
                    About Us
                  </Link>
                  <Link
                    href={"services"}
                    className="text-stone-950 text-base font-normal leading-normal"
                  >
                    Our Services
                  </Link>
                </div>
              </div>
              <div className="flex-col justify-center items-start gap-6 inline-flex">
                <div className="text-stone-950 text-xl font-semibold">
                  Links
                </div>
                <div className="flex-col justify-start items-start gap-5 flex">
                  <Link
                    href={"contact"}
                    className="text-stone-950 text-base font-normal leading-normal"
                  >
                    Contact Us
                  </Link>
                  <Link
                    href={"gallery"}
                    className="text-stone-950 text-base font-normal leading-normal"
                  >
                    Gallery
                  </Link>
                  <Link
                    href={"featurednews"}
                    className="text-stone-950 text-base font-normal leading-normal"
                  >
                    News
                  </Link>
                </div>
              </div>
              <div className="flex-col justify-center items-start gap-6 inline-flex">
                <div className="text-stone-950 text-xl font-semibold">
                  Resource
                </div>
                <div className="flex-col justify-start items-start gap-5 flex">
                  <Link
                    href={"login"}
                    className="text-stone-950 text-base font-normal leading-normal"
                  >
                    Login
                  </Link>
                  <Link
                    href={"signup"}
                    className="text-stone-950 text-base font-normal leading-normal"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full h-[0px] border border-violet-100"></div>
        </div>
        <div className="justify-start items-center gap-[188px] flex flex-wrap">
          <div className="justify-start items-start gap-14 flex flex-wrap">
            <div className="justify-center items-center gap-3 flex">
              <div className="w-10 h-10 bg-sky-950 rounded-[25px] flex-col justify-center items-center inline-flex">
                <svg
                  width="20"
                  height="21"
                  viewBox="0 0 20 21"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15.139 12.1751C14.5792 12.0547 14.1364 12.3146 13.7443 12.5416C13.3428 12.7755 12.5792 13.3949 12.1416 13.2363C9.90086 12.3137 7.7934 10.3525 6.88112 8.10278C6.72033 7.65578 7.33683 6.88739 7.56898 6.48111C7.79426 6.08782 8.04877 5.64082 7.9327 5.07688C7.8278 4.57011 6.47097 2.84362 5.99119 2.3715C5.67477 2.05964 5.35061 1.88812 5.01785 1.8604C3.76679 1.80669 2.36956 3.476 2.1245 3.87535C1.51058 4.7269 1.51402 5.85999 2.13482 7.2339C3.63094 10.9242 9.28952 16.4935 12.9937 18.0459C13.6773 18.3655 14.3024 18.5258 14.8638 18.5258C15.4133 18.5258 15.9025 18.3725 16.323 18.0684C16.6403 17.8856 18.378 16.419 18.3324 15.1343C18.3049 14.8069 18.1338 14.4794 17.826 14.1624C17.3574 13.6781 15.642 12.2808 15.139 12.1751Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="flex-col justify-start items-start inline-flex">
                <div className="text-stone-950 text-sm font-normal leading-normal">
                  Have a question?
                </div>
                <div className="text-stone-950 text-sm font-semibold leading-7">
                  <a href="tel:+2349160002740">+234-916-0002-740</a>
                </div>
              </div>
            </div>
            <div className="justify-center items-center gap-3 flex">
              <div className="w-10 h-10 bg-sky-950 rounded-[25px] flex-col justify-center items-center inline-flex">
                <svg
                  width="40"
                  height="41"
                  viewBox="0 0 40 41"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect y="0.5" width="40" height="40" rx="20" fill="#001F3F" />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M24.1158 12.6914C25.2333 12.6914 26.3083 13.1331 27.0991 13.9256C27.8908 14.7164 28.3333 15.7831 28.3333 16.8997V23.4831C28.3333 25.8081 26.4416 27.6914 24.1158 27.6914H15.8833C13.5575 27.6914 11.6666 25.8081 11.6666 23.4831V16.8997C11.6666 14.5747 13.5491 12.6914 15.8833 12.6914H24.1158ZM25.4416 18.1417L25.5083 18.075C25.7075 17.8333 25.7075 17.4833 25.4991 17.2417C25.3833 17.1175 25.2241 17.0417 25.0583 17.025C24.8833 17.0158 24.7166 17.075 24.5908 17.1917L20.8333 20.1917C20.35 20.5925 19.6575 20.5925 19.1666 20.1917L15.4166 17.1917C15.1575 17 14.7991 17.025 14.5833 17.25C14.3583 17.475 14.3333 17.8333 14.5241 18.0833L14.6333 18.1917L18.425 21.15C18.8916 21.5167 19.4575 21.7167 20.05 21.7167C20.6408 21.7167 21.2166 21.5167 21.6825 21.15L25.4416 18.1417Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="flex-col justify-start items-start inline-flex">
                <div className="text-stone-950 text-sm font-normal leading-normal">
                  Email us at:
                </div>
                <div className="text-stone-950 text-sm font-semibold leading-7">
                  <a href="mailto:info@twonodetechnologies.com">
                    info@twonodetechnologies.com
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center text-stone-950 text-base font-normal leading-normal">
            Copyright © 2025 TwoNode Technologies | All Rights Reserved
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
