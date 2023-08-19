export default function ExtraInfo({ children }) {
  return (
    <div className="bg-white -mx-8 px-8 py-8 border-t">
      <div>
        <h2 className="font-semibold text-2xl">Extra info</h2>
      </div>
      <div className="text-sm text-gray-700 leading-5 mb-4 mt-2">
        {children}
      </div>
    </div>
  );
}