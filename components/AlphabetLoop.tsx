import React, { useState, useEffect, useRef } from 'react';
import { Text, HStack, Box } from 'native-base';
import { Alphabet, Frame } from '../types/Alphabet';
import _ from 'lodash';

const frame: Frame = {
  index: 0,
  timestamp: null,
  delta: 300,
  alphabetIndex: 0,
  blink: {
    rightEyeClosed: false
  },
  train: {
    wordIndex: 0,
    charIndex: 0
  }
}

export default function AlphabetLoop ({
  alphabet,
  speed = 300,
  onFrame = (frame: Frame) => { },
  beforeFrameChange = (lastFrame: Frame, newFrame: Frame) => newFrame,
  beforeBackgroundColorChange = (index: number, frame: Frame, color: string) => color,
  beforeTextColorChange = (index: number, frame: Frame, color: string) => color
}: {
  alphabet: Alphabet,
  speed: number,
  onFrame?: (frame: Frame) => void,
  beforeFrameChange?: (lastFrame: Frame | null, newFrame: Frame) => Frame,
  beforeBackgroundColorChange?: (index: number, frame: Frame, color: string) => string,
  beforeTextColorChange?: (index: number, frame: Frame, color: string) => string
}) {
  const [currentFrame, setCurrentFrame] = useState<Frame>(_.cloneDeep({
    ...frame,
    speed
  }));

  var interval: ReturnType<typeof setTimeout> | null = null;

  function getBackgroundColor (index: number, frame: Frame): string {
    let color = "white";

    if (index === frame.alphabetIndex) {
      color = "orange.400";
    }

    return beforeBackgroundColorChange(index, frame, color);
  }

  function getTextColor (index: number, frame: Frame): string {
    return beforeTextColorChange(index, frame, 'black');
  }

  useEffect(() => {
    interval = setInterval(() => {
      setCurrentFrame((lastFrame) => {
        const newFrame = _.cloneDeep(lastFrame);

        newFrame.index += 1;
        newFrame.delta = speed;
        newFrame.timestamp = Date.now();

        if ((newFrame.alphabetIndex + 1) < alphabet.chars.length) {
          newFrame.alphabetIndex += 1;
        } else {
          newFrame.alphabetIndex = 0;
        }

        return beforeFrameChange(lastFrame, newFrame);
      });
    }, speed);

    return () => {
      if (interval) {
        clearInterval(interval);

        setCurrentFrame(_.cloneDeep({
          ...frame,
          speed,
          timestamp: Date.now()
        }));
      }
    }
  }, [speed]);

  useEffect(() => {
    onFrame(currentFrame);
  }, [currentFrame]);

  return (
    <Box display="flex" flexDirection="row" flexWrap="wrap" flexGrow="1">
      {alphabet.chars.map((char, index) => {
        return (
          <Box
            key={`char-${char.id}`}
            w="25%"
            h={`${100 / 7}%`}
            display="flex"
            alignItems="center"
            borderWidth="1"
            borderColor="grey"
            backgroundColor={getBackgroundColor(index, currentFrame)}
            opacity="0.70">
            <HStack>
              <Text fontSize="5xl" color={getTextColor(index, currentFrame)}>{char.label}</Text>
            </HStack>
          </Box>
        )
      })}
    </Box>
  );
}