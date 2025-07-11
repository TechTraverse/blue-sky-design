// import React from 'react';

import './timeRangeSlider.css';
import { Button } from './Button';
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

export interface TimeRangeSliderProps {
  providedDate?: Date;
  onDateSelect?: () => void;
  onDateRangeSelect?: () => void;
}

export const TimeRangeSlider = ({
  providedDate,
  onDateSelect,
  onDateRangeSelect }: TimeRangeSliderProps) => (
  <div className="time-range-slider">
    <Button primary={true} className="next-prev-date-range">
      <IoIosArrowBack
        onClick={() => console.log("Last date range")}
        title="Select Date"
      />
    </Button>
    <Button primary={true} className="next-prev-date-range">
      <IoIosArrowForward
        onClick={() => console.log("Next date range")}
        title="Select Date"
      />
    </Button>
  </div>
);
