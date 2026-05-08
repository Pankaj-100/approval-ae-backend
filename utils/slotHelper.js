exports.formatSlotRange = (startSlot, interval) => {
  // split time
  let [time, modifier] = startSlot.split(" ");

  let [hours, minutes] = time.split(":");

  hours = parseInt(hours);
  minutes = parseInt(minutes);

  // convert to 24 hour
  if (modifier === "PM" && hours !== 12) {
    hours += 12;
  }

  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }

  // create date object
  const date = new Date();

  date.setHours(hours);
  date.setMinutes(minutes);

  // add interval
  date.setMinutes(date.getMinutes() + interval);

  // format end time
  let endHours = date.getHours();

  const endMinutes = date.getMinutes().toString().padStart(2, "0");

  const endModifier = endHours >= 12 ? "PM" : "AM";

  endHours = endHours % 12 || 12;

  const endTime = `${endHours}:${endMinutes} ${endModifier}`;

  return {
    startTime: startSlot,
    endTime,

    label: `${startSlot} - ${endTime}`,
  };
};
