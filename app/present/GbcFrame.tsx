const EmbeddedMap: React.FC = () => {
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
          className="absolute top-0 left-0 w-full h-full md:max-h-[85vh]"
        />
      </div>
    </div>
  );
};

export default EmbeddedMap;
