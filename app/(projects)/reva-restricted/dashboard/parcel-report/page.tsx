const ExampleWithIframe = () => {
  return (
    <div className="bg-[#0a162b50] max-w-full max-h-full min-w-full min-h-[85vh] p-4">
      <iframe
        src="/reva/Related.html" // Path to the static HTML file in public directory
        width="100%"
        height="800px"
        title="Embedded HTML"
        className="max-w-full mx-auto rounded-xl min-h-[85vh]"
      />
    </div>
  );
};

export default ExampleWithIframe;
