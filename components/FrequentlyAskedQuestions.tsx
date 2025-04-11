import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const FrequentlyAskedQuestions = () => {
  const plusSvg = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 10H18M10.0001 2V18"
        stroke="#141414"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div className="mywrapper w-full min-h-[450px] py-[75px] bg-white flex-col justify-start items-center inline-flex">
      <div className="w-full min-h-[300px] flex-col justify-start items-center gap-[60px] flex">
        <div className="text-center text-neutral-900 text-5xl font-semibold capitalize">
          Frequently Asked Questions
        </div>

        <Accordion
          className="w-full flex-col justify-start items-start gap-[18px] flex"
          type="single"
          collapsible
        >
          <AccordionItem className="w-full" value="item-1">
            <AccordionTrigger className="w-full">
              <div className="cursor-pointer w-full flex-col justify-start items-start flex">
                <div className="w-full px-[30px] py-6 bg-gray-50 justify-between items-center inline-flex">
                  <h2 className="text-neutral-900 text-2xl font-bold leading-[34px]">
                    What do we do at TwoNode Technologies?
                  </h2>
                  {plusSvg}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="pl-[5%]">
                TwoNode Technologies is a revolutionary GIS solution company
                providing that local industry solution that you need
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem className="w-full" value="item-2">
            <AccordionTrigger className="w-full">
              <div className="cursor-pointer w-full flex-col justify-start items-start flex">
                <div className="w-full px-[30px] py-6 bg-gray-50 justify-between items-center inline-flex">
                  <div className="text-neutral-900 text-2xl font-bold leading-[34px]">
                    On what platform is your solutions built?
                  </div>
                  {plusSvg}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="pl-[5%]">
                At the moment, most of our solutions are products of ESRI, the
                global market leader in geographic information system (GIS)
                software and location intelligence.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className=""></div>
      </div>
    </div>
  );
};
