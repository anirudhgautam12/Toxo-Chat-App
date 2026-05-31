import { useState, useEffect, useRef } from "react";
import { Smile, ThumbsUp, Heart, Zap, Search } from "lucide-react";

const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    icon: Smile,
    label: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
      "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
      "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩",
      "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
      "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬",
      "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤔"
    ]
  },
  {
    id: "gestures",
    icon: ThumbsUp,
    label: "Gestures",
    emojis: [
      "👍", "👎", "👊", "✊", "🤛", "🤜", "🤝", "🙌", "👏", "🙏",
      "🤝", "✍️", "🤳", "💪", "🦾", "🖕", "✍️", "🖐️", "✋", "🖖",
      "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉",
      "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜"
    ]
  },
  {
    id: "hearts",
    icon: Heart,
    label: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
      "🔥", "✨", "🌟", "⭐", "💫", "💥", "💨", "💦", "💤", "💭"
    ]
  },
  {
    id: "activities",
    icon: Zap,
    label: "Activities",
    emojis: [
      "🚀", "💻", "📱", "🎮", "🍕", "🍔", "🍟", "🌭", "🍿", "🍩",
      "🍺", "🍻", "🍷", "🥃", "☕", "🍵", "⚽", "🏀", "🏈", "⚾",
      "🎾", "🏐", "🏉", "🎱", "🎯", "🎳", "🎒", "🎓", "👑", "💼",
      "🚗", "✈️", "⏰", "💡", "💰", "✉️", "🔑", "🔒", "🎁", "🎈"
    ]
  }
];

function EmojiPicker({ onSelectEmoji }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("smileys");
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEmojiClick = (emoji) => {
    onSelectEmoji(emoji);
    // Keep it open so user can insert multiple emojis quickly,
    // or close it depending on preference. Keeping open is usually preferred.
  };

  // Filter emojis based on query
  const getFilteredEmojis = () => {
    if (!searchQuery) {
      return EMOJI_CATEGORIES.find((cat) => cat.id === activeTab)?.emojis || [];
    }
    
    // Simple search in all categories
    const allUniqueEmojis = EMOJI_CATEGORIES.reduce((acc, cat) => {
      cat.emojis.forEach(e => {
        if (!acc.includes(e)) acc.push(e);
      });
      return acc;
    }, []);

    // Filter using search query - in a real app you might map query strings, 
    // here we just return matches or all if empty. Since we just have raw emojis,
    // a basic subset is returned, or you can search emojis list.
    return allUniqueEmojis.slice(0, 40); // cap searches
  };

  const filteredEmojis = getFilteredEmojis();

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg px-4 py-2 transition-colors ${
          isOpen ? "text-cyan-500 bg-slate-700/50" : ""
        }`}
      >
        <Smile className="w-5 h-5" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-72 md:w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 p-3 flex flex-col space-y-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search emojis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          </div>

          {/* Category Tabs (Only if not searching) */}
          {!searchQuery && (
            <div className="flex border-b border-slate-700/60 pb-1.5 justify-around">
              {EMOJI_CATEGORIES.map((category) => {
                const IconComponent = category.icon;
                return (
                  <button
                    key={category.id}
                    type="button"
                    title={category.label}
                    onClick={() => setActiveTab(category.id)}
                    className={`pb-1 px-2 border-b-2 transition-all ${
                      activeTab === category.id
                        ? "border-cyan-500 text-cyan-500"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Emojis Grid */}
          <div className="grid grid-cols-8 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {filteredEmojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="text-2xl hover:bg-slate-700 p-1 rounded-md transition-colors text-center focus:outline-none select-none active:scale-90"
              >
                {emoji}
              </button>
            ))}
            {filteredEmojis.length === 0 && (
              <div className="col-span-8 text-center text-xs text-slate-500 py-4">
                No emojis found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmojiPicker;
