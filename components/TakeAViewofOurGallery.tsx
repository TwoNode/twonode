const TakeAViewofOurGallery = () => {
  const Images = [
    "/gal1.png",
    "/signing.jpg",
    "/gal3.png",
    "/gal4.png",
    "/gal5.png",
    "/gal6.png",
    "/gal7.png",
    "/gal8.png",
  ];

  return (
    <div className="mywrapper min-h-[2072px] py-[71px] bg-white flex-col justify-start items-center gap-[47px] inline-flex">
      <div className="w-full flex-col justify-start items-center gap-5 flex">
        <div className="flex-col justify-start items-center gap-[15px] flex">
          <div className="justify-start items-center gap-[15px] inline-flex">
            <div className="w-5 h-[0px] border-2 border-[#001f3f]"></div>
            <h2 className="text-[#001f3f] text-xl font-medium font-['Bricolage Grotesque'] leading-[34px]">
              Our Gallery
            </h2>
          </div>
          <div className="flex-col justify-start items-start gap-[18px] flex">
            <h3 className="text-center text-[#0c0e12] text-[28px] lg:text-[32px] font-extrabold font-['Bricolage Grotesque'] leading-[54px]">
              Take A View of Our Gallery
            </h3>
          </div>
        </div>
      </div>
      <div className="w-full self-stretch min-h-[1780px] gap-[30px] grid lg:grid-cols-2 grid-cols-1 justify-items-center">
        {Images.map((imgUrl, index) =>
          index == 1 ? (
            <div key={index} className="w-full p-3 flex justify-center">
              <img
                className="object-contain w-full aspect-[6000/3368] max-w-[570px] max-h-[430px]"
                src={imgUrl}
              />
            </div>
          ) : (
            <div key={index} className="w-full p-3 flex justify-center">
              <img
                className="w-full h-full max-w-[570px] max-h-[430px]"
                src={imgUrl}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default TakeAViewofOurGallery;
