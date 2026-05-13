import React from "react";
import ReactDOM from "react-dom/client";

console.log("Main.jsx: Starting React app");

try {
  // Test importing the App component
  import("./App").then((AppModule) => {
    console.log("Main.jsx: App module imported successfully");
    const App = AppModule.default;
    
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(React.createElement(App));
    
    console.log("Main.jsx: React app rendered successfully");
  }).catch((error) => {
    console.error("Main.jsx: Error importing App module:", error);
    document.getElementById("root").innerHTML = `
      <div style="background: orange; color: white; padding: 20px; font-size: 24px;">
        IMPORT ERROR: ${error.message}
      </div>
    `;
  });
  
} catch (error) {
  console.error("Main.jsx: Error rendering React app:", error);
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.style.background = 'red';
    rootElement.style.color = 'white';
    rootElement.style.padding = '20px';
    rootElement.style.fontSize = '24px';
    rootElement.textContent = `REACT ERROR: ${error.message}`;
  }
}
