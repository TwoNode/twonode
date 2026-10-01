import React from "react";
import CreateNotificationForm from "../../../components/CreateNotificationForm";

const CreateNotificationPage = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Create Notification
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Create and send notifications to users, admins, or all users
        </p>
      </div>

      <CreateNotificationForm />
    </div>
  );
};

export default CreateNotificationPage;
