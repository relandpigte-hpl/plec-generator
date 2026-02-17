import React from "react";

export default function Instructions() {
  return (
    <div className="my-2">
      <h3>Instructions:</h3>
      <p className="text-sm text-slate-700 mt-2">
        Only file types supported: GIF & MP4 using AppLovin’s specific specs.
      </p>
      <div className="mt-2 text-sm text-slate-700">
        <p>
          For best results, use files that are 854x1138 pixels (portrait) or
          1138x854 pixels (landscape).
        </p>
      </div>

      <div className="mt-2 text-sm text-slate-900">
        <p>
          <span className="font-bold">Check File Size:</span> File sizes cannot be larger than
        </p>
        <ul className="list-disc list-inside mt-2 p-0 grid grid-cols-2 gap-1">
          <li>3.4 MB for AppLovin (Combined)</li>
          <li>1.4 MB for Facebook (Individual)</li>
          <li>1.0 MB for Google (Individual)</li>
          <li>3.4 MB for Unity (Combined)</li>
          <li>3.4 MB for Vungle (Combined)</li>
          <li>3.4 MB for Mintegral (Combined)</li>
          <li>3.4 MB for IronSource (Combined)</li>
        </ul>
      </div>
    </div>
  );
}
