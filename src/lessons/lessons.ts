export interface LessonContainer {
  title: string;
  lessons: Lesson[];
}
export interface Lesson {
  file: string;
  title: string;
  description?: string;
  level: 'easy' | 'medium' | 'hard';
}

export const lessons: LessonContainer[] = [
  {
    title: "LEDs",
    lessons: [
      { file: "blink.xml", title: "Blink", level: "easy" },
      { file: "traffic_lights.xml", title: "Traffic Lights", level: "easy" },
      { file: "automatic_parking_gate.xml", title: "Automatic Parking Gate", level: "medium" },
      { file: "car_parking_system.xml", title: "Car Parking System", level: "medium" },
    ],
  },
  {
    title: "RGB LED",
    lessons: [
      { file: "rgb_led_pushbutton.xml", title: "RGB LED with button", level: "medium" },
    ],
  },
  {
    title: "Sensors",
    lessons: [
      { file: "intruder_sensor.xml", title: "Intruder Sensor", level: "medium" },
      { file: "solar_tracking_system.xml", title: "Solar Tracking System", level: "medium" },
    ],
  },
  {
    title: "Servos",
    lessons: [
      { file: "butterfly.xml", title: "Servo Butterfly", level: "medium" },
    ],
  },
  {
    title: "LCD",
    lessons: [
      { file: "lcd_display_text.xml", title: "Display Text", level: "easy" },
    ],
  },
  {
    title: "Fast Leds",
    lessons: [
      { file: "solid_colors.xml", title: "Solid Colors", level: "easy" },
      { file: "2different_colors.xml", title: "Every other color", level: "medium" },
      { file: "christmas_lights.xml", title: "Christmas Lights", level: "medium" },
      { file: "snake.xml", title: "Snake Pattern", level: "hard" },
      { file: "rainbow.xml", title: "Rainbow Lights", level: "hard" },
      { file: "rainbow_rolling.xml", title: "Rainbow Lights Streaming", level: "hard" },
      { file: "sonar_rgbleds.xml", title: "Motion Sensor with RGB Leds", level: "medium" },
      { file: "sonar_rgbleds_spin.xml", title: "Motion Sensor with Spinning Lights", level: "hard" },
    ],
  },
  {
    title: "Led Matrix",
    lessons: [
      { file: "ledmatrix_happy_face.xml", title: "Happy Face", level: "easy" },
      { file: "ledmatrix_blink.xml", title: "Wink", level: "easy" },
      { file: "ledmatrix_loop.xml", title: "Led Matrix Loop", level: "medium" },
    ],
  },
];