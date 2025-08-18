import "./speedIndicator.css";
import { Duration } from 'effect';

const speedDescriptors: {
  label: string;
  value: number;
}[] = [{
  // 0
  label: '-1 hour/sec',
  value: -(Duration.toMillis(Duration.hours(1))),
}, {
  // 1
  label: '-30 min/sec',
  value: -(Duration.toMillis(Duration.minutes(30))),
}, {
  // 2
  label: '-10 min/sec',
  value: -(Duration.toMillis(Duration.minutes(10))),
}, {
  // 3
  label: '-5 min/sec',
  value: -(Duration.toMillis(Duration.minutes(5))),
}, {
  // 4
  label: '-1 min/sec',
  value: -(Duration.toMillis(Duration.minutes(5))),
}, {
  // 5
  label: '1 min/sec',
  value: Duration.toMillis(Duration.minutes(1)),
}, {
  // 6
  label: '5 min/sec',
  value: Duration.toMillis(Duration.minutes(5)),
}, {
  // 7
  label: '10 min/sec',
  value: Duration.toMillis(Duration.minutes(10)),
}, {
  // 8
  label: '30 min/sec',
  value: Duration.toMillis(Duration.minutes(30)),
}, {
  // 9
  label: '1 hour/sec',
  value: Duration.toMillis(Duration.hours(1)),
}];

export const SpeedIndicator = () => {
  return (
    <div className="speed-indicator">
      <label className="speed-indicator">
        {"Speed: "}
      </label>
      <label className="speed-indicator">
        {speedDescriptors[6].label}
      </label>
    </div>
  );
}
