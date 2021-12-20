import {Component, OnInit} from '@angular/core';
import {HttpClient} from "@angular/common/http";

export class ObjectType {
    constructor(
        public id: number,
        public name: string,
        public parentObjectTypeId: number
    ) {
    }
}

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

    objectTypes?: ObjectType[];

    selectedObjectTypeId!: string;

    constructor(
        private httpClient: HttpClient
    ) {
    }

    ngOnInit(): void {
        this.getAllObjectTypes().subscribe(objectTypes => {
            this.objectTypes = objectTypes;
        });
    }

    getAllObjectTypes() {
        return this.httpClient.get<ObjectType[]>('http://localhost:8080/object_types');
    }

    setSelectedObjectType() {
        // @ts-ignore
        let objectTypeId = document.getElementById('objectTypeList').value;
        if (objectTypeId != this.selectedObjectTypeId)
            this.selectedObjectTypeId = objectTypeId;
    }

}
