import { useState } from "react";
import { useNavigate } from "react-router";
import { favoritesApi } from "~/lib/api/engagement";
import { store } from "~/lib/feature/store";
import { Heart } from "~/components/shared/icons";
import { cn } from "~/lib/utils/cn";

// Nút trái tim — toggle yêu thích. Khách chưa đăng nhập → chuyển sang /login.
export function FavoriteButton({
  productId,
  initial = false,
  size = 18,
  className,
}: {
  productId: string;
  initial?: boolean;
  size?: number;
  className?: string;
}) {
  const navigate = useNavigate();
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!store.getState().authState.token) {
      navigate("/login");
      return;
    }
    setBusy(true);
    try {
      if (fav) {
        await favoritesApi.remove(productId);
        setFav(false);
      } else {
        await favoritesApi.add(productId);
        setFav(true);
      }
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={fav}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition active:scale-90",
        className
      )}
    >
      <Heart
        size={size}
        weight={fav ? "fill" : "regular"}
        className={fav ? "text-red-500" : "text-slate-500"}
      />
    </button>
  );
}
