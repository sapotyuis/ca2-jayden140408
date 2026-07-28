export const FIRST_PERSON_LOOK_DISTANCE = 10;

export const getFirstPersonLookTarget = (
  eyePosition,
  heading,
  lookYaw = 0,
  lookPitch = 0,
) => ({
  x: eyePosition.x + Math.sin(heading + lookYaw) * FIRST_PERSON_LOOK_DISTANCE,
  y: eyePosition.y + lookPitch * 6,
  z: eyePosition.z + Math.cos(heading + lookYaw) * FIRST_PERSON_LOOK_DISTANCE,
});
