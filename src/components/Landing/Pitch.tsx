// components/Landing/Pitch.tsx
import FAQ from './FAQ';
import Testimonials from './Testimonials';

const Pitch: React.FC = () => {
  return (
    <div className="max-w-md mx-auto">
      <section className="flex flex-col items-center justify-center  bg-secondary p-10 text-center">
        <h1 className="text-3xl md:text-4xl font-heading text-quaternary tracking-tighter italic mb-4">
          GAMBLING FOR YOUR GROUPCHAT
        </h1>
        <p className="text-lg md:text-xl text-quaternary mb-8">
          Make a bet on anything you can think of with your friend and have the
          winner decided by another friend.
        </p>

        <h1 className="text-3xl md:text-4xl font-heading text-font tracking-tighter italic mb-10">
          HOW IT WORKS
        </h1>
        <div className="flex flex-col md:flex-row justify-center items-center space-y-6 md:space-y-0 md:space-x-2 mb-6">
          <div className="text-center">
            <img
              src="/better1.png"
              alt="Better 1"
              className="w-28 h-28  mx-auto mb-2"
            />
            <p className="text-lg md:text-xl font-bold text-font">Maker</p>
            <p className=" md:text-base text-font">
              Creates bet, picks an opponent and judge
            </p>
          </div>
          <div className="text-center">
            <img
              src="/better2.png"
              alt="Better 2"
              className="w-28 h-28  mx-auto mb-2"
            />
            <p className="text-lg md:text-xl font-bold text-font">Taker</p>
            <p className=" md:text-base text-font">
              Accepts the terms and funds their side of it or rejects the bet
            </p>
          </div>
          <div className="text-center">
            <img
              src="/decider.png"
              alt="Decider"
              className="w-28 h-28  mx-auto mb-2"
            />
            <p className="text-lg md:text-xl font-bold text-font">Judge</p>
            <p className=" md:text-base text-font">
              Chooses who wins, or if it should be cancelled
            </p>
          </div>
        </div>
      </section>
      <FAQ />
      <Testimonials />
    </div>
  );
};

export default Pitch;
