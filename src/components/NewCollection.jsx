import React from "react";
import collection from "./data/newCollection.json";
import "./NewCollection.css";

const NewCollection = () => {
  return (
    <div className="collection-container">
      <h2 className="collection-title">New Collection</h2>

      <div className="collection-grid">
        {collection.map((item) => (
          <div className="collection-card" key={item.id}>
            <div className="collection-images">
              {item.images?.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${item.name} - ${index + 1}`}
                  className={index === 4 ? "full-width-image" : ""}
                />
              ))}
            </div>
            <div className="collection-info">
              <h3>{item.name}</h3>
              <p>{item.finish}</p>
              <p>{item.size}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewCollection;

