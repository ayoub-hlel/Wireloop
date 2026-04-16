<script lang="ts">
  import config from "../../../../env";
</script>

<style>
  h2 {
    margin-top: 20px;
  }
  h3 {
    margin-top: 15px;
  }
  a {
    text-decoration: underline;
    color: blue;
  }
</style>

<svelte:head>
  <title>Arduino Workflow Builder - About</title>
</svelte:head>

{#if config.site === 'arduino-workflow-builder-org'}
  <div class="row">
    <div class="col">
      <h2>Back Story</h2>
    </div>
  </div>
  <div class="row">
    <div class="col">
      <p>
        Arduino Workflow Builder is website for coding microcontrollers like the Arduino
        Uno and Arduino Mega. The basic idea is video editting for code. It
        allows you to create code with an easy to use drag and drop language
        called Blockly. I wanted to create something easy to use and fun for
        kids and adults to learn how to code.
      </p>
    </div>
  </div>

  <div class="row">
    <div class="col">
      <h2>Thank you</h2>
    </div>
  </div>
  <div class="row">
    <div class="col">
      <p>
        I have recieved advice and help from a number of mentors and
        professionals while building this. None of this would have been possible
        without their guidance. I also have volunteer taught and tutored. The
        experience from working with students has greatly influenced me. They
        are the inspiration behind my work.
      </p>
    </div>
  </div>

  <div class="row">
    <div class="col">
      <h2>Thank you to all Libraries</h2>
    </div>
  </div>

  <div class="row">
    <div class="col">
      <p>Without you none of this would have been possible.</p>
    </div>
  </div>

  <div class="row">
    <div class="col">
      <h3>Arduino Libraries</h3>
    </div>
  </div>
  <div class="row">
    <div class="col">
      <ul class="list-group">
        <li class="list-group-item"><a href="https://www.arduino.cc/">Arduino</a></li>
        <li class="list-group-item"><a href="https://github.com/arduino/arduino-cli">Arduino CLI</a></li>
        <li class="list-group-item"><a href="https://github.com/noopkat/avrgirl-arduino">ArvGirl Arduino</a></li>
        <li class="list-group-item"><a href="https://github.com/adafruit/Adafruit_NeoPixel">AdaFruit NeoPixel</a></li>
        <li class="list-group-item"><a href="https://github.com/johnrickman/LiquidCrystal_I2C">LiquidCrystal_I2C</a></li>
        <li class="list-group-item"><a href="https://github.com/z3t0/Arduino-IRremote">IRremote</a></li>
        <li class="list-group-item"><a href="https://github.com/adafruit/DHT-sensor-library">DHT sensor library</a></li>
        <li class="list-group-item"><a href="https://github.com/shaai/Arduino_LED_matrix_sketch">LedControlMS</a></li>
        <li class="list-group-item"><a href="https://github.com/electronicdrops/RFIDRdm630">RFIDRdm630</a></li>
        <li class="list-group-item"><a href="https://github.com/arduino-libraries/Servo">Servo</a></li>
        <li class="list-group-item"><a href="https://github.com/adafruit/Adafruit-Motor-Shield-library">Adafruit Motor Shield Library</a></li>
      </ul>
    </div>
  </div>

  <div class="row">
    <div class="col">
      <h3>Web Libraries</h3>
    </div>
  </div>
  <div class="row">
    <div class="col">
      <ul class="list-group">
        <li class="list-group-item"><a href="https://developers.google.com/blockly/">Blockly</a></li>
        <li class="list-group-item"><a href="https://svelte.dev/">Svelte</a></li>
        <li class="list-group-item"><a href="https://getbootstrap.com">Bootstrap</a></li>
        <li class="list-group-item"><a href="https://sveltestrap.js.org">SvelteStrap</a></li>
        <li class="list-group-item"><a href="https://svgjs.com/docs/3.0/">svg.js</a></li>
        <li class="list-group-item"><a href="https://prismjs.com/">prismjs</a></li>
        <li class="list-group-item"><a href="https://lodash.com/">lodash</a></li>
        <li class="list-group-item"><a href="https://github.com/eligrey/FileSaver.js#readme">file-saver</a></li>
        <li class="list-group-item"><a href="https://sweetalert.js.org/guides/">sweetalert</a></li>
      </ul>
    </div>
  </div>
{/if}
