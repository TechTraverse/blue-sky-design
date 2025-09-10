import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import React from "react";
import "./newArrowButtons.css";

export const PrevDateButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <button
      className="arrow-btn"
      onClick={onClick}
      title="Previous"
    >
      <FiChevronLeft />
    </button>
  );
};

export const NextDateButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <button
      className="arrow-btn"
      onClick={onClick}
      title="Next"
    >
      <FiChevronRight />
    </button>
  );
};
