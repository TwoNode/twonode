// import GoogleMapReact from "google-map-react";

// const AnyReactComponent = ({ text }) => <div>{text}</div>;

export const OurMap = () => {
  // const defaultProps = {
  //   center: {
  //     lat: 10.99835602,
  //     lng: 77.01502627,
  //   },
  //   zoom: 11,
  // };

  return (
    <section className="mywrapper w-full">
      <div className="w-full min-h-[797px] py-24 bg-white grid grid-cols-1 lg:grid-cols-2 gap-6 justify-items-center lg:justify-items-stretch">
        <div className="flex-col justify-start items-start gap-[30px] inline-flex">
          <div className="flex-col justify-start items-start gap-[15px] flex">
            <div className="justify-start items-center gap-[15px] inline-flex">
              <div className="w-5 h-[0px] border-2 border-sky-950"></div>
              <div className="text-sky-950 text-xl font-medium leading-[34px]">
                Our Location
              </div>
            </div>
            <div className="max-w-[442px] text-zinc-950 text-[28px] font-semibold leading-[45px]">
              Location: 58,Kudirat Abiola Way Oregun, Ikeja, Lagos.
            </div>
          </div>
          <div className="flex-col justify-start items-start gap-6 flex">
            <div className="text-zinc-950 text-xl font-medium leading-[34px]">
              Reach Out On:
            </div>
            <div className="flex-col justify-start items-start gap-5 flex">
              <div className="justify-start items-center gap-3.5 inline-flex">
                <div className="w-12 h-12 bg-sky-950/opacity-10 rounded-[30px] flex-col justify-center items-center inline-flex">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      width="48"
                      height="48"
                      rx="24"
                      fill="#001F3F"
                      fillOpacity="0.14"
                    />
                    <path
                      d="M30.1668 26.3802C29.4951 26.2357 28.9637 26.5475 28.4932 26.8199C28.0114 27.1006 27.0951 27.8438 26.57 27.6536C23.8811 26.5465 21.3521 24.193 20.2574 21.4934C20.0644 20.957 20.8042 20.0349 21.0828 19.5474C21.3532 19.0754 21.6586 18.539 21.5193 17.8623C21.3934 17.2541 19.7652 15.1824 19.1895 14.6158C18.8098 14.2416 18.4208 14.0358 18.0215 14.0025C16.5202 13.938 14.8435 15.9412 14.5495 16.4204C13.8127 17.4423 13.8169 18.802 14.5618 20.4507C16.3572 24.8791 23.1475 31.5622 27.5925 33.4251C28.4128 33.8087 29.1629 34.001 29.8366 34.001C30.496 34.001 31.0831 33.817 31.5876 33.4521C31.9684 33.2328 34.0536 31.4728 33.9989 29.9312C33.9659 29.5383 33.7606 29.1453 33.3912 28.7649C32.8289 28.1838 30.7704 26.507 30.1668 26.3802Z"
                      fill="#001F3F"
                    />
                  </svg>{" "}
                </div>
                <div className="text-neutral-600 text-xl font-medium leading-7">
                  +234-916-0002-740
                </div>
              </div>
              <div className="justify-start items-center gap-3.5 inline-flex">
                <div className="w-12 h-12 bg-sky-950/opacity-10 rounded-[30px] flex-col justify-center items-center inline-flex">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      width="48"
                      height="48"
                      rx="24"
                      fill="#001F3F"
                      fill-opacity="0.14"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M28.939 15C30.28 15 31.57 15.53 32.519 16.481C33.469 17.43 34 18.71 34 20.05V27.95C34 30.74 31.73 33 28.939 33H19.06C16.269 33 14 30.74 14 27.95V20.05C14 17.26 16.259 15 19.06 15H28.939ZM30.53 21.5403L30.61 21.4603C30.849 21.1703 30.849 20.7503 30.599 20.4603C30.46 20.3113 30.269 20.2203 30.07 20.2003C29.86 20.1893 29.66 20.2603 29.509 20.4003L25 24.0003C24.42 24.4813 23.589 24.4813 23 24.0003L18.5 20.4003C18.189 20.1703 17.759 20.2003 17.5 20.4703C17.23 20.7403 17.2 21.1703 17.429 21.4703L17.56 21.6003L22.11 25.1503C22.67 25.5903 23.349 25.8303 24.06 25.8303C24.769 25.8303 25.46 25.5903 26.019 25.1503L30.53 21.5403Z"
                      fill="#001F3F"
                    />
                  </svg>
                </div>
                <div className="text-neutral-600 text-xl font-medium leading-7">
                  info@twonodetechnologies.com
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-hidden w-full max-w-[657px] max-h-[650px] rounded-[10px]">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d495.4224570385099!2d3.3656489437469883!3d6.5996505043054166!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b924f65a38b7d%3A0xb222be673edabfd2!2s58%20Kudirat%20Abiola%20Way%2C%20Oregun%2C%20Lagos%20101233%2C%20Lagos!5e0!3m2!1sen!2sng!4v1721888613730!5m2!1sen!2sng"
            width="600"
            height="500"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>

      {/* // Important! Always set the container height explicitly
      <div style={{ height: "100vh", width: "100%" }}>
        <GoogleMapReact
          bootstrapURLKeys={{ key: "" }}
          defaultCenter={defaultProps.center}
          defaultZoom={defaultProps.zoom}
        >
          <AnyReactComponent lat={59.955413} lng={30.337844} text="Our Location" />
        </GoogleMapReact>
      </div> */}

      {/* <GoogleMapsEmbed
        apiKey="XYZ"
        height={200}
        width="100%"
        mode="place"
        q="Brooklyn+Bridge,New+York,NY"
      /> */}
    </section>
  );
};
