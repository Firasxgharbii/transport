export type ConnectedUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  role?: string;
};

export function getInitials(user: ConnectedUser) {
  const first =
    user.first_name ||
    user.name?.split(" ")[0] ||
    "";

  const last =
    user.last_name ||
    user.name?.split(" ")[1] ||
    "";

  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "SA";
}

export function getFullName(user: ConnectedUser) {
  return (
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.name ||
    "Super Admin"
  );
}