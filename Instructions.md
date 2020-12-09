# Instructions:
* Go to https://saewoonam.github.io/webserial-current-source/
If the web serial feature is enabled in the browser you should see something like the image below
<img src="https://user-images.githubusercontent.com/2872116/101087607-acb33600-356f-11eb-9b31-bc77c5fd32da.png" width="400">

* Click on "Connect" and select the serial port device that corresponds to the current sources that you would like to control
<img src="https://user-images.githubusercontent.com/2872116/101087605-ac1a9f80-356f-11eb-8093-9da832bb0a02.png" width=400>

* If successful, you should get a screen that looks something like:
<img src="https://user-images.githubusercontent.com/2872116/101087601-ab820900-356f-11eb-9910-a657a3c7178f.png" width=400>

## Explanation of buttons


<img src="https://github.com/saewoonam/webserial-current-source/blob/main/images/board2computer.png" height=44> **read settings from the board**

<img src="https://github.com/saewoonam/webserial-current-source/blob/main/images/computer2board.png" height=44> **set currents with settings from website**

<img src="https://github.com/saewoonam/webserial-current-source/blob/main/images/save_on_board.png" height=44> **if possible save settings on microcontroller board**

<img src="https://github.com/saewoonam/webserial-current-source/blob/main/images/download.png" height=44> **download settings shown on othe website to a file on the computer**

<img src="https://github.com/saewoonam/webserial-current-source/blob/main/images/upload.png" height=44> **upload settings from a file on the computer on to the website: *does not set the currents, press the computer to board button to set the currents***

## Changing values in the table
### Name
The name can be edited by double clicking on the text
### Value
The value of the current can be changed by double clicking on the text
The values are restricted to be between -100 and 100.  The wheel on a mouse can
be used to increment the value.  The arrow keys also increment/decrement.   And, the value can be typed in 
### Bias
Board always supplies current.   To effectively disable a channel, click the
box in the "bias" column to set the current.  If the box is unchecked, then the current source will be set to zero. There is no ability to
"open" circuit the channel.   It can only be efffectively shorted to gruond.
