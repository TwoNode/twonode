const ExampleWithIframe = () => {
  return (
    <div className="bg-[#0a162b50] min-w-screen min-h-screen p-4">
      <iframe
        src="/route.html" // Path to the static HTML file in public directory
        width="100%"
        height="1000px"
        title="Embedded HTML"
      />
    </div>
  );
};

export default ExampleWithIframe;
