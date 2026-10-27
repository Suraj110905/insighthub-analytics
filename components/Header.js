"use client";

import { useState } from "react";
import { Search, Bell, Menu, Check } from "lucide-react";

export default function Header({ pageTitle = "Overview", onToggleSidebar, onSearch, searchQuery = "" }) {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: "October Dataset uploaded", time: "2 hours ago", unread: true },
    { id: 2, title: "Monthly revenue target exceeded", time: "1 day ago", unread: false },
    { id: 3, title: "DynamoDB sync pipeline verified", time: "2 days ago", unread: false },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile trigger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-slate-700 font-medium capitalize">{pageTitle}</span>
          </nav>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight capitalize">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right Area: Search, Notifications & Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search Field */}
        <div className="relative hidden md:block w-64 lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search metrics, orders..."
            value={searchQuery}
            onChange={(e) => onSearch && onSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-all"
          />
        </div>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-700 ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-800">Notifications</span>
                <span className="text-[11px] text-teal-700 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Mark all read
                </span>
              </div>
              <div className="space-y-1.5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2 rounded-lg text-xs ${
                      n.unread ? "bg-teal-50/60" : "hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-medium text-slate-800">{n.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Area */}
        <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-teal-700 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
            AM
          </div>
          <div className="hidden sm:block text-left">
            <span className="text-xs font-semibold text-slate-800 block leading-tight">
              Alex Morgan
            </span>
            <span className="text-[11px] text-slate-500 block leading-tight">
              Business Ops
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
