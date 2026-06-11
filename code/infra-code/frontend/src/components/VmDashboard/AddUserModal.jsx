import React, { useState } from "react";
import proxmoxApi from "../../api/proxmoxapi";

const emptyForm = {
    staff_code: "",
    name: "",
    entity: "",
    group: "",
    division: "",
    suggestions: []
};

const AddUserModal = ({ vm, onClose, onSubmit }) => {
    const [userForms, setUserForms] = useState([ { ...emptyForm } ]);

    const handleStaffCodeChange = (index, value) => {
        const forms = [...userForms];
        forms[index].staff_code = value;

        if (value.length >= 2) {
                proxmoxApi.get(`/proxmox/users/search?query=${value}`)
            .then(res => {
                forms[index].suggestions = res.data;
                setUserForms(forms);
            });
        }
        else {
            forms[index].suggestions = [];
            setUserForms(forms);
        }
    };

    const fillUserDetails = (index, emp) => {
        const forms = [...userForms];

        forms[index] = {
            ...forms[index],
            staff_code: emp.staff_code,
            name: emp.name,
            entity: emp.entity,
            group: emp.group,
            division: emp.division,
            suggestions: []
        };

        setUserForms(forms);
    };

    const addNewUser = () => {
        setUserForms([...userForms, { ...emptyForm }]);
    };

    const removeUser = (index) => {
        if (userForms.length === 1) return;
        setUserForms(userForms.filter((_, i) => i !== index));
    };

    return (
        <div className = "fixed inset-0 bg-black bg-opacity-40 background-blure-sm flex justify-center items-center z-50">
            <div className = "bg-white p-6 rounded shadow-lg w-[900px] max-h-[90%] overflow-auto">
                <h2 className = "text-xl font-semibold mb-4">Add Users to {vm?.vm_name}</h2>

                <div className = "grid grid-cols-6 gap-2 text-sm font-semibold text-gray-600 mb-2 px-2">
                    <div> Staff Code </div>
                    <div> Name </div>
                    <div> Entity </div>
                    <div> Group </div>
                    <div> Division </div>
                </div>
                {userForms.map((form, index) => (
                    <div
                        key={index}
                        className="border rounded mb-3 p-2"
                    >
                        <div className="grid grid-cols-6 gap-2 items-center text-sm">

                        {/* Staff Code */}
                        <div className="col-span-1 relative">
                            <input
                            className="border rounded px-2 py-1 w-full"
                            placeholder="Staff Code"
                            value={form.staff_code}
                            onChange={(e) => handleStaffCodeChange(index, e.target.value)}
                            />

                            {/* Autocomplete dropdown */}
                            {form.suggestions.length > 0 && (
                            <div className="absolute z-10 bg-white border mt-1 w-full max-h-32 overflow-auto">
                                {form.suggestions.map((emp) => (
                                <div key={emp.staff_code} className="px-2 py-1 hover:bg-gray-200 cursor-pointer" onClick={() => fillUserDetails(index, emp)}>
                                    {emp.staff_code} - {emp.name}
                                </div>
                                ))}
                            </div>
                            )}
                        </div>

                        {/* Name */}
                        <div className="col-span-1 truncate">
                            <span className="font-medium">{form.name || "-"}</span>
                        </div>

                        {/* Entity */}
                        <div className="col-span-1 truncate">
                            {form.entity || "-"}
                        </div>

                        {/* Group */}
                        <div className="col-span-1 truncate">
                            {form.group || "-"}
                        </div>

                        {/* Division */}
                        <div className="col-span-1 truncate">
                            {form.division || "-"}
                        </div>

                        {/* Remove */}
                        <div className="col-span-1 text-center">
                            <button
                            className="text-red-600 hover:text-red-800"
                            onClick={() => removeUser(index)}
                            title="Remove user"
                            >
                            ✕
                            </button>
                        </div>
                        </div>
                    </div>
                    ))}

                <button className = "bg-green-600 text-white px-4 py-2 rounded mb-4" onClick = {addNewUser}> + Add New User</button>

                <div className = "flex justify-end gap-3">
                    <button className = "px-4 py-2 bg-gray-300 rounded" onClick = {onClose}>Cancel</button>

                    <button className = "px-4 py-2 bg-blue-600 text-white rounded" onClick = {() => onSubmit(userForms)}>Save Users</button>
                </div>
            </div>
        </div>
    );
};

export default AddUserModal;