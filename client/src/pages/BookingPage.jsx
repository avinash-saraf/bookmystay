import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AddressLink from "../components/AddressLink";
import PlaceGallery from "../components/PlaceGallery";
import BookingDates from "../components/BookingDates";
import ExtraInfo from "../components/ExtraInfo";

export default function BookingPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  useEffect(() => {
    if (id) {
      axios.get('/bookings').then(response => {
        const foundBooking = response.data.find(({ _id }) => _id === id);
        if (foundBooking) {
          setBooking(foundBooking);
        }
      })
    }
  }, [id])

  if (!booking) {
    return '';
  }

  return (
    <div className="-mx-8 px-8 mt-4 -mb-4 pt-4 bg-gray-100">
      <h1 className="text-3xl mt-4">{booking.place.title}</h1>
      <AddressLink className="my-2 block">{booking.place.address}</AddressLink>

      <div className="bg-gray-200 p-6 my-6 rounded-2xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl mb-4">Your booking information: </h2>
          <BookingDates booking={booking} />
        </div>
        <div className="bg-primary p-6 text-white rounded-2xl">
          <div>Total price</div>
          <div className="text-3xl">${booking.price}</div>
        </div>

      </div>

      <PlaceGallery place={booking.place} />

      <div className="mt-4 mb-8 gap-8 p-4">
        <div className="my-4">
          <h2 className="font-semibold text-2xl">Description</h2>
          {booking.place.description}
        </div>
        Check-in: {booking.place.checkIn}:00 <br />
        Check-out: {booking.place.checkOut}:00 <br />
        Max number of guests: {booking.place.maxGuests}
      </div>
      <ExtraInfo>{booking.place.extraInfo}</ExtraInfo>
    </div>

  );
}